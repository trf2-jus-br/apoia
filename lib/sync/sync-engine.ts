/**
 * Sync Engine - Synchronizes prompts from library providers into the ia_prompt database table.
 * 
 * The sync engine:
 * 1. Reads prompts from a LibraryProvider (local filesystem or future github)
 * 2. For each prompt, checks if a record with that uuid exists (is_latest=1)
 * 3. If not found: inserts a new record
 * 4. If found but content changed: creates a new version (set old is_latest=0, insert new)
 * 5. If found and content identical: skips
 * 6. Deactivates prompts from this library that are no longer present in the source
 */
import knex from '../db/knex'
import { getId } from '../db/dao/utils'
import { slugify } from '../utils/utils'
import { LibraryProvider, ParsedPrompt, SyncResult } from './types'
import devLog from '../utils/log'

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
        target: parsed.metadata?.target || null,
        scope: parsed.metadata?.scope || null,
        instance: parsed.metadata?.instance || null,
        matter: parsed.metadata?.matter || null,
    }
}

/**
 * Compare two content objects to determine if the prompt has changed.
 * Only compares the fields that come from the .md file (not DB-only fields).
 */
function contentHasChanged(dbContent: Record<string, any>, newContent: Record<string, any>): boolean {
    const keys = ['system_prompt', 'prompt', 'json_schema', 'format', 'template']
    for (const key of keys) {
        const dbVal = (dbContent?.[key] ?? null) || null
        const newVal = (newContent?.[key] ?? null) || null
        if (dbVal !== newVal) return true
    }
    return false
}

/**
 * Synchronize prompts from a single library provider into the database.
 * 
 * @param provider - The library provider to read prompts from
 * @returns A SyncResult with counts of added/updated/deactivated/unchanged prompts
 */
export async function syncLibrary(provider: LibraryProvider): Promise<SyncResult> {
    if (!knex) {
        return { library: 'unknown', added: 0, updated: 0, deactivated: 0, unchanged: 0, errors: ['Database not available'] }
    }

    const contents = await provider.read()
    const result: SyncResult = {
        library: contents.library,
        added: 0,
        updated: 0,
        deactivated: 0,
        unchanged: 0,
        errors: [],
    }

    // Collect UUIDs that are present in the source
    const sourceUuids = new Set<string>()

    for (const parsed of contents.prompts) {
        sourceUuids.add(parsed.uuid)

        try {
            await syncSinglePrompt(parsed, contents.library, contents.version, result)
        } catch (err: any) {
            result.errors.push(`Error syncing ${parsed.slug} (${parsed.uuid}): ${err.message}`)
        }
    }

    // Deactivate prompts from this library that are no longer in the source
    try {
        const deactivated = await deactivateRemovedPrompts(contents.library, sourceUuids)
        result.deactivated = deactivated
    } catch (err: any) {
        result.errors.push(`Error deactivating removed prompts: ${err.message}`)
    }

    devLog(`[sync-engine] Library "${contents.library}" synced: +${result.added} ~${result.updated} -${result.deactivated} =${result.unchanged}${result.errors.length ? ` (${result.errors.length} errors)` : ''}`)

    return result
}

/**
 * Sync a single parsed prompt into the database.
 */
async function syncSinglePrompt(
    parsed: ParsedPrompt,
    library: string,
    libraryVersion: string,
    result: SyncResult
): Promise<void> {
    // Find existing record with this uuid and is_latest=1
    const existing = await knex!('ia_prompt')
        .select('*')
        .where({ uuid: parsed.uuid, is_latest: 1 })
        .first()

    const newContent = buildContentJson(parsed)
    const slug = slugify(parsed.name) || parsed.slug

    if (!existing) {
        // INSERT new prompt
        const [returned] = await knex!('ia_prompt').insert({
            uuid: parsed.uuid,
            kind: `^${parsed.slug}`,
            name: parsed.name,
            slug,
            content: JSON.stringify(newContent),
            is_latest: 1,
            share: 'PADRAO',
            library,
            library_version: libraryVersion,
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

        if (contentHasChanged(dbContent, newContent)) {
            // Create new version: set old is_latest=0, insert new row with same base_id
            await knex!('ia_prompt').update({ is_latest: 0 }).where({ id: existing.id })

            const [returned] = await knex!('ia_prompt').insert({
                uuid: parsed.uuid,
                base_id: existing.base_id,
                kind: existing.kind,
                name: parsed.name,
                slug,
                content: JSON.stringify(newContent),
                is_latest: 1,
                share: existing.share || 'PADRAO',
                library,
                library_version: libraryVersion,
            }).returning('id')
            result.updated++
        } else {
            // Content unchanged - update library_version if different
            if (existing.library_version !== libraryVersion) {
                await knex!('ia_prompt').update({ library_version: libraryVersion }).where({ id: existing.id })
            }
            result.unchanged++
        }
    }
}

/**
 * Deactivate (set is_latest=0) prompts from a given library that are no longer in the source.
 * Only affects prompts that have the same library value and is_latest=1.
 */
async function deactivateRemovedPrompts(library: string, activeUuids: Set<string>): Promise<number> {
    if (!knex) return 0
    if (activeUuids.size === 0) return 0

    // Find all active prompts from this library
    const activeDbPrompts = await knex('ia_prompt')
        .select('id', 'uuid')
        .where({ library, is_latest: 1 })

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
 * Convenience function: sync from the local prompts directory.
 * This is the main entry point called during application startup.
 */
export async function syncLocalPrompts(): Promise<SyncResult> {
    const { LocalProvider } = await import('./providers/local')
    const provider = new LocalProvider('local:./prompts')
    return syncLibrary(provider)
}
