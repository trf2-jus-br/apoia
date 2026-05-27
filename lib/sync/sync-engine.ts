/**
 * Sync Engine - Synchronizes prompts from library providers into the ia_prompt database table.
 * 
 * The sync engine:
 * 1. Reads prompts from an OriginProvider (local filesystem or future github)
 * 2. For each prompt, checks if a record with that uuid exists (is_latest=1)
 * 3. If not found: inserts a new record
 * 4. If found but content changed: creates a new version (set old is_latest=0, insert new)
 * 5. If found and content identical: skips
 * 6. Deactivates prompts from this library that are no longer present in the source
 */
import knex from '../db/knex'
import { getId } from '../db/dao/utils'
import { slugify } from '../utils/utils'
import { LibraryConfig, OriginProvider, ParsedPrompt, SyncResult, WorkflowRef, WorkflowResolved, WorkflowStepResolved } from './types'
import { LocalProvider } from './providers/local'
import devLog from '../utils/log'
import { canonicalize } from 'json-canonicalize'

/**
 * Build the `content` JSON column value from a ParsedPrompt.
 * This matches the shape expected by IAPrompt.content in mysql-types.ts.
 */
function buildContentJson(parsed: ParsedPrompt): Record<string, any> {
    return {
        system_prompt: parsed.systemPrompt || null,
        prompt: parsed.prompt || null,
        json_schema: parsed.jsonSchema || null,
        format: parsed.format || null,
        template: parsed.template || null,
        author: parsed.metadata?.author || null,
        target: parsed.metadata?.target || 'PROCESSO',
        scope: parsed.metadata?.scope || null,
        instance: parsed.metadata?.instance || null,
        matter: parsed.metadata?.matter || null,
        // Aggregator / display metadata
        ...(parsed.metadata?.sort != null ? { sort: parsed.metadata.sort } : {}),
        ...((parsed.metadata?.piece_strategy || ((parsed.metadata?.target || 'PROCESSO') === 'PROCESSO')) ? { piece_strategy: parsed.metadata.piece_strategy || 'MAIS_RELEVANTES' } : {}),
        ...(parsed.metadata?.context ? { context: parsed.metadata.context } : {}),
        ...(parsed.metadata?.grupo ? { grupo: parsed.metadata.grupo } : {}),
        ...(parsed.metadata?.batch_report != null ? { batch_report: parsed.metadata.batch_report } : {}),
        ...(parsed.metadata?.plugins ? { plugins: parsed.metadata.plugins } : {}),
        ...(parsed.metadata?.profile ? { profile: parsed.metadata.profile } : {}),
        ...(parsed.metadata?.summary ? { summary: parsed.metadata.summary } : {}),
        ...(parsed.metadata?.editor_label ? { editor_label: parsed.metadata.editor_label } : {}),
        ...(parsed.metadata?.piece_descr ? { piece_descr: parsed.metadata.piece_descr } : {}),
    }
}

/**
 * Compare two content objects to determine if the prompt has changed.
 * Only compares the fields that come from the .md file (not DB-only fields).
 */
function contentHasChanged(dbContent: Record<string, any>, newContent: Record<string, any>): boolean {
    return JSON.stringify(canonicalize(dbContent)) !== JSON.stringify(canonicalize(newContent))
    const keys = ['system_prompt', 'prompt', 'json_schema', 'format', 'template',
        'author', 'target', 'scope', 'instance', 'matter',
        'sort', 'piece_strategy', 'context', 'grupo', 'batch_report', 'plugins',
        'workflow']
    for (const key of keys) {
        const dbVal = dbContent?.[key] ?? null
        const newVal = newContent?.[key] ?? null
        if (typeof dbVal === 'object' || typeof newVal === 'object') {
            if (JSON.stringify(dbVal) !== JSON.stringify(newVal)) return true
        } else {
            if ((dbVal || null) !== (newVal || null)) return true
        }
    }
    return false
}

/**
 * Build a slug->UUID lookup index from all parsed prompts.
 * Used to resolve `path:` references in workflow definitions.
 * @param prompts - The parsed prompts to index
 * @param slugPrefix - Optional prefix that was applied to slugs (for scoped resolution)
 */
function buildSlugIndex(prompts: ParsedPrompt[], slugPrefix?: string): Map<string, string> {
    const index = new Map<string, string>()
    for (const p of prompts) {
        // Index by the final (potentially prefixed) slug
        index.set(p.slug, p.uuid)
        // Also index by the ORIGINAL slug (without prefix) for scoped intra-library resolution
        if (slugPrefix) {
            const originalSlug = p.slug.startsWith(slugPrefix + '-') ? p.slug.slice(slugPrefix.length + 1) : p.slug
            index.set(originalSlug, p.uuid)
        }
        // Also index by relative path without extension (for subdirectory prompts)
        const pathWithoutExt = p.relativePath.replace(/\.md$/, '')
        if (pathWithoutExt !== p.slug) {
            index.set(pathWithoutExt, p.uuid)
            // Also index the prefixed version of the path
            if (slugPrefix) {
                index.set(slugPrefix + '-' + pathWithoutExt, p.uuid)
            }
        }
    }
    return index
}

/** Build a UUID->name lookup index from all parsed prompts. */
function buildNameIndex(prompts: ParsedPrompt[]): Map<string, string> {
    const index = new Map<string, string>()
    for (const p of prompts) {
        index.set(p.uuid, p.name)
    }
    return index
}

/**
 * Resolve a WorkflowRef (path or uuid) to a resolved step with UUID.
 * Returns null if the reference cannot be resolved.
 */
function resolveWorkflowRef(ref: WorkflowRef, slugIndex: Map<string, string>, nameIndex: Map<string, string>): WorkflowStepResolved | null {
    let uuid: string | undefined

    if (ref.uuid) {
        uuid = ref.uuid
    } else if (ref.path) {
        uuid = slugIndex.get(ref.path)
    }

    if (!uuid) return null

    const step: WorkflowStepResolved = { uuid }
    const name = nameIndex.get(uuid)
    if (name) step.name = name
    if (ref.optional) step.optional = true
    if (ref.condition) step.condition = ref.condition
    return step
}

/**
 * Resolve all workflow references in a parsed prompt to UUIDs.
 * Returns the resolved workflow object, or null if the prompt has no workflow.
 */
function resolveWorkflow(parsed: ParsedPrompt, slugIndex: Map<string, string>, nameIndex: Map<string, string>): WorkflowResolved | null {
    if (!parsed.predecessors?.length && !parsed.successors?.length) return null

    const workflow: WorkflowResolved = {}

    if (parsed.predecessors?.length) {
        const resolved = parsed.predecessors
            .map(ref => resolveWorkflowRef(ref, slugIndex, nameIndex))
            .filter(Boolean) as WorkflowStepResolved[]
        if (resolved.length > 0) workflow.predecessors = resolved
    }

    if (parsed.successors?.length) {
        const resolved = parsed.successors
            .map(ref => resolveWorkflowRef(ref, slugIndex, nameIndex))
            .filter(Boolean) as WorkflowStepResolved[]
        if (resolved.length > 0) workflow.successors = resolved
    }

    return (workflow.predecessors || workflow.successors) ? workflow : null
}

/**
 * Synchronize prompts from a single origin provider into the database.
 * 
 * @param provider - The origin provider to read prompts from
 * @param slugPrefix - Optional prefix to prepend to all slugs from this library
 * @param configuredOrigins - Set of all origin URLs currently configured (for rename detection)
 * @returns A SyncResult with counts of added/updated/deactivated/unchanged prompts
 */
export async function syncOrigin(provider: OriginProvider, slugPrefix?: string, configuredOrigins?: Set<string>): Promise<SyncResult> {
    if (!knex) {
        return { origin: 'unknown', added: 0, updated: 0, deactivated: 0, unchanged: 0, errors: ['Database not available'] }
    }

    const contents = await provider.read()

    // Apply slug prefix if configured
    if (slugPrefix) {
        for (const p of contents.prompts) {
            p.slug = slugPrefix + '-' + p.slug
        }
    }

    const result: SyncResult = {
        origin: contents.origin,
        added: 0,
        updated: 0,
        deactivated: 0,
        unchanged: 0,
        errors: [],
    }

    // Build slug->UUID index for resolving path: references
    // Includes both prefixed and original slugs for scoped intra-library resolution
    const slugIndex = buildSlugIndex(contents.prompts, slugPrefix)
    // Build UUID->name index for populating name in workflow steps
    const nameIndex = buildNameIndex(contents.prompts)

    // Collect UUIDs that are present in the source
    const sourceUuids = new Set<string>()

    for (const parsed of contents.prompts) {
        sourceUuids.add(parsed.uuid)

        try {
            const resolvedWorkflow = resolveWorkflow(parsed, slugIndex, nameIndex)
            await syncSinglePrompt(parsed, contents.origin, contents.version, resolvedWorkflow, result, configuredOrigins)
        } catch (err: any) {
            result.errors.push(`Error syncing ${parsed.slug} (${parsed.uuid}): ${err.message}`)
        }
    }

    // Deactivate prompts from this origin that are no longer in the source
    try {
        const deactivated = await deactivateRemovedPrompts(contents.origin, sourceUuids)
        result.deactivated = deactivated
    } catch (err: any) {
        result.errors.push(`Error deactivating removed prompts: ${err.message}`)
    }

    devLog(`[sync-engine] Origin "${contents.origin}" synced: +${result.added} ~${result.updated} -${result.deactivated} =${result.unchanged}${result.errors.length ? ` (${result.errors.length} errors)` : ''}`)

    return result
}

/**
 * Sync a single parsed prompt into the database.
 */
async function syncSinglePrompt(
    parsed: ParsedPrompt,
    origin: string,
    originVersion: string,
    resolvedWorkflow: WorkflowResolved | null,
    result: SyncResult,
    configuredOrigins?: Set<string>,
): Promise<void> {

    // if (parsed.slug === 'sentenca') {
    //     devLog(`[sync-engine] Syncing prompt with slug "sentenca" and UUID ${parsed.uuid}. Resolved workflow: ${JSON.stringify(resolvedWorkflow)}`)
    // }  

    // Find existing record with this uuid and is_latest=1
    let existing = await knex!('ia_prompt')
        .select('*')
        .where({ uuid: parsed.uuid, is_latest: 1 })
        .first()

    // If no active record found, check for any record with this uuid (data recovery)
    // This handles the case where all versions got is_latest=0 (e.g. from a previous bug)
    if (!existing) {
        const latestInactive = await knex!('ia_prompt')
            .select('*')
            .where({ uuid: parsed.uuid })
            .orderBy('id', 'desc')
            .first()
        if (latestInactive) {
            // Reactivate the most recent version
            await knex!('ia_prompt').update({ is_latest: 1, origin, origin_version: originVersion }).where({ id: latestInactive.id })
            existing = { ...latestInactive, is_latest: 1 }
            devLog(`[sync-engine] Reactivated orphan prompt ${parsed.slug} (id=${latestInactive.id})`)
        }
    }

    // Cross-origin UUID conflict detection.
    // If the existing record belongs to a different origin:
    //   - If the old origin is still configured → real conflict, skip.
    //   - If the old origin is no longer configured → repo was renamed, adopt new origin.
    if (existing && existing.origin && existing.origin !== origin) {
        const oldOriginStillConfigured = configuredOrigins?.has(existing.origin) ?? false
        if (oldOriginStillConfigured) {
            result.errors.push(`UUID conflict: prompt '${parsed.slug}' (${parsed.uuid}) already belongs to origin '${existing.origin}', cannot import from '${origin}'`)
            return
        }
        // Old origin no longer configured — adopt this prompt under the new origin
        devLog(`[sync-engine] Adopting prompt '${parsed.slug}' (${parsed.uuid}) from old origin '${existing.origin}' → '${origin}'`)
        await knex!('ia_prompt').update({ origin }).where({ id: existing.id })
        existing = { ...existing, origin }
    }

    const newContent = buildContentJson(parsed)
    // Include workflow inside content
    const resolvedWorkflowObj = resolvedWorkflow || null
    if (resolvedWorkflowObj) {
        newContent.workflow = resolvedWorkflowObj
    }
    const slug = parsed.slug || slugify(parsed.name)
    const contentJson = JSON.stringify(newContent)

    if (!existing) {
        // INSERT new prompt
        const [returned] = await knex!('ia_prompt').insert({
            uuid: parsed.uuid,
            category: null,
            name: parsed.name,
            slug,
            content: contentJson,
            is_latest: 1,
            share: parsed.metadata?.share || 'PADRAO',
            origin,
            origin_version: originVersion,
        }).returning('id')
        const id = getId(returned)
        // Set base_id = id for new prompts (self-referential)
        await knex!('ia_prompt').update({ base_id: id }).where({ id })
        result.added++
    } else {
        // Parse existing content
        let dbContent: Record<string, any> = {}
        if (typeof existing.content === 'string') {
            try { dbContent = JSON.parse(existing.content) } catch { dbContent = {} }
        } else if (existing.content && typeof existing.content === 'object') {
            dbContent = existing.content
        }

        const changed = contentHasChanged(dbContent, newContent)
        const newShare = parsed.metadata?.share || existing.share || 'PADRAO'
        const shareChanged = existing.share !== newShare
        const nameChanged = existing.name !== parsed.name
        const slugChanged = existing.slug !== slug

        if (changed || shareChanged || nameChanged || slugChanged) {
            // Create new version: set old is_latest=0, insert new row with same base_id
            await knex!('ia_prompt').update({ is_latest: 0 }).where({ id: existing.id })

            const [returned] = await knex!('ia_prompt').insert({
                uuid: parsed.uuid,
                base_id: existing.base_id,
                category: existing.category || null,
                name: parsed.name,
                slug,
                content: contentJson,
                is_latest: 1,
                share: parsed.metadata?.share || existing.share || 'PADRAO',
                origin,
                origin_version: originVersion,
            }).returning('id')
            result.updated++
        } else {
            // Content unchanged - update origin_version if different
            if (existing.origin_version !== originVersion) {
                await knex!('ia_prompt').update({ origin_version: originVersion }).where({ id: existing.id })
            }
            result.unchanged++
        }
    }
}

/**
 * Deactivate (set is_latest=0) prompts from a given origin that are no longer in the source.
 * Only affects prompts that have the same origin value and is_latest=1.
 */
async function deactivateRemovedPrompts(origin: string, activeUuids: Set<string>): Promise<number> {
    if (!knex) return 0
    if (activeUuids.size === 0) return 0

    // Find all active prompts from this origin
    const activeDbPrompts = await knex('ia_prompt')
        .select('id', 'uuid')
        .where({ origin, is_latest: 1 })

    let count = 0
    for (const dbPrompt of activeDbPrompts) {
        if (!activeUuids.has(dbPrompt.uuid)) {
            await knex('ia_prompt').update({ is_latest: 0 }).where({ id: dbPrompt.id })
            count++
        }
    }

    return count
}

/**
 * Sync all configured prompt libraries.
 * 
 * Reads PROMPT_LIBRARIES env var and syncs each library.
 * 
 * PROMPT_LIBRARIES format: "url,slug-prefix,token;url2,prefix2;url3"
 *   - Entries separated by semicolons
 *   - Within each entry: url[,slugPrefix[,token]]
 */
export async function syncAllLibraries(): Promise<SyncResult[]> {
    const { createProvider, parseLibrariesEnv } = await import('./providers/factory')

    const results: SyncResult[] = []

    // Always sync local prompts first
    // try {
    //     const localResult = await syncLocalPrompts()
    //     results.push(localResult)
    // } catch (err: any) {
    //     results.push({
    //         origin: 'local:./prompts',
    //         added: 0, updated: 0, deactivated: 0, unchanged: 0,
    //         errors: [`Failed to sync local prompts: ${err.message}`],
    //     })
    // }

    // Sync configured remote libraries
    const configs = parseLibrariesEnv(process.env.PROMPT_LIBRARIES)
    if (configs.length === 0) return results

    // Build the set of all configured origins for rename detection
    const configuredOrigins = new Set<string>(configs.map(c => c.url))

    for (const cfg of configs) {
        try {
            const provider = createProvider(cfg.url, cfg.token)
            const result = await syncOrigin(provider, cfg.slugPrefix, configuredOrigins)
            results.push(result)
        } catch (err: any) {
            results.push({
                origin: cfg.url,
                added: 0, updated: 0, deactivated: 0, unchanged: 0,
                errors: [`Failed to sync: ${err.message}`],
            })
        }
    }

    return results
}

/**
 * Sync a single library by URL. Used by the webhook endpoint.
 * Looks up the LibraryConfig from PROMPT_LIBRARIES to get slugPrefix and token.
 */
export async function syncLibraryByUrl(url: string): Promise<SyncResult> {
    const { createProvider, parseLibrariesEnv, findLibraryConfig } = await import('./providers/factory')

    const configs = parseLibrariesEnv(process.env.PROMPT_LIBRARIES)
    const cfg = findLibraryConfig(url, configs)
    const token = cfg?.token
    const slugPrefix = cfg?.slugPrefix
    const configuredOrigins = new Set<string>(configs.map(c => c.url))
    const provider = createProvider(url, token)
    return syncOrigin(provider, slugPrefix, configuredOrigins)
}
