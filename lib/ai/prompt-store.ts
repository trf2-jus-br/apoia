/**
 * Prompt Store - Resolves prompt definitions from the database.
 * 
 * This is the single source of truth for prompt definitions at runtime.
 * After the sync engine loads .md files into ia_prompt, this module
 * queries ia_prompt to resolve prompts by slug or UUID.
 * 
 * Replaces the old static `internalPrompts` dictionary that read .md files
 * at build time.
 */
import knex from '../db/knex'
import { IAPrompt } from '../db/mysql-types'
import { PromptDefinitionType } from './prompt-types'
import devLog from '../utils/log'

/**
 * Convert an ia_prompt DB record into a PromptDefinitionType for runtime use.
 */
function dbRecordToDefinition(record: IAPrompt): PromptDefinitionType {
    const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content

    return {
        kind: record.kind?.startsWith('^') ? record.kind.substring(1) : record.kind,
        systemPrompt: content?.system_prompt || undefined,
        prompt: content?.prompt || undefined,
        jsonSchema: content?.json_schema || undefined,
        format: content?.format || undefined,
        template: content?.template || undefined,
        metadata: {
            author: content?.author || undefined,
        },
        cacheControl: true,
        dbId: record.id,
        uuid: record.uuid,
    }
}

/**
 * Resolve a prompt definition by slug.
 * 
 * Looks up the ia_prompt table for a library prompt with `kind = '^{slug}'` and is_latest = 1.
 * Falls back to the `resumo_peca` slug for any `resumo-*` variant.
 * 
 * @param slug - The prompt slug (with hyphens, e.g. 'analise-completa' or 'resumo-peticao-inicial')
 * @returns The prompt definition with dbId and uuid, or throws if not found
 */
export async function getPromptDefinition(slug: string): Promise<PromptDefinitionType> {
    if (!knex) throw new Error('Database not available')

    // Normalize: hyphens to underscores (internal convention for kind field)
    let slugUnderscore = slug.replace(/-/g, '_')

    // Try to find library prompt by kind = '^slug'
    let record = await knex('ia_prompt')
        .select('*')
        .where({ kind: `^${slug}`, is_latest: 1 })
        .first() as IAPrompt | undefined

    // Fallback: try with underscore variant
    if (!record && slugUnderscore !== slug) {
        record = await knex('ia_prompt')
            .select('*')
            .where({ kind: `^${slugUnderscore}`, is_latest: 1 })
            .first() as IAPrompt | undefined
    }

    // Fallback: resumo-* variants → resumo-peca
    if (!record && slug.startsWith('resumo-')) {
        record = await knex('ia_prompt')
            .select('*')
            .where({ kind: '^resumo-peca', is_latest: 1 })
            .first() as IAPrompt | undefined
    }

    if (!record) {
        throw new Error(`Prompt '${slug}' not found in database. Run sync engine first.`)
    }

    return dbRecordToDefinition(record)
}

/**
 * Resolve a prompt definition by UUID.
 * 
 * @param uuid - The prompt UUID
 * @returns The prompt definition, or throws if not found
 */
export async function getPromptDefinitionByUuid(uuid: string): Promise<PromptDefinitionType> {
    if (!knex) throw new Error('Database not available')

    const record = await knex('ia_prompt')
        .select('*')
        .where({ uuid, is_latest: 1 })
        .first() as IAPrompt | undefined

    if (!record) {
        throw new Error(`Prompt with UUID '${uuid}' not found in database.`)
    }

    return dbRecordToDefinition(record)
}

/**
 * Resolve a prompt definition from a user-created prompt (by ia_prompt.id).
 * Used for prompts created via the UI (library IS NULL).
 * 
 * @param id - The ia_prompt.id
 * @returns The prompt definition with dbId, or throws if not found
 */
export async function getPromptDefinitionById(id: number): Promise<PromptDefinitionType> {
    if (!knex) throw new Error('Database not available')

    const record = await knex('ia_prompt')
        .select('*')
        .where({ id })
        .first() as IAPrompt | undefined

    if (!record) {
        throw new Error(`Prompt with id ${id} not found in database.`)
    }

    return dbRecordToDefinition(record)
}

/**
 * Get all library prompt slugs (for listing/UI).
 * Returns unique slugs from prompts where library IS NOT NULL and is_latest = 1.
 */
export async function getLibraryPromptSlugs(): Promise<string[]> {
    if (!knex) return []

    const records = await knex('ia_prompt')
        .select('kind')
        .whereNotNull('library')
        .where({ is_latest: 1 })

    return records
        .map((r: any) => r.kind as string)
        .filter((k: string) => k?.startsWith('^'))
        .map((k: string) => k.substring(1))
}

/**
 * Get an aggregator prompt record by its kind (e.g., '^MINUTA_DE_SENTENCA').
 * Aggregators are library-sourced records with workflow successors and metadata
 * but no system_prompt / prompt content.
 * 
 * @param kind - The kind field including the ^ prefix (e.g., '^MINUTA_DE_SENTENCA')
 * @returns The IAPrompt record with content and workflow, or null if not found
 */
export async function getAggregatorByKind(kind: string): Promise<IAPrompt | null> {
    if (!knex) return null

    const record = await knex('ia_prompt')
        .select('*')
        .where({ kind, is_latest: 1 })
        .whereNotNull('library')
        .first() as IAPrompt | undefined

    if (!record) return null

    // Parse content if stored as string
    if (typeof record.content === 'string') {
        record.content = JSON.parse(record.content)
    }
    // Parse workflow if stored as string
    if (typeof record.workflow === 'string') {
        record.workflow = JSON.parse(record.workflow)
    }

    return record
}

/**
 * Get the first non-chat successor prompt slug from an aggregator's workflow.
 * Used to determine the "main" prompt for an internal synthesis type.
 * 
 * @param kind - The kind field including the ^ prefix
 * @returns The slug of the first non-chat successor, or null
 */
export async function getFirstProductSlug(kind: string): Promise<string | null> {
    const aggregator = await getAggregatorByKind(kind)
    if (!aggregator?.workflow?.successors?.length) return null

    for (const step of aggregator.workflow.successors) {
        const def = await getPromptDefinitionByUuid(step.uuid).catch(() => null)
        if (!def) continue
        // Skip chat prompts — we want the main product prompt
        if (def.kind === 'chat' || def.kind === 'chat-standalone') continue
        return def.kind
    }
    return null
}

/**
 * Get all aggregator records (library-sourced, kind starts with ^, is_latest=1).
 * Returns full IAPrompt records with parsed content and workflow.
 */
export async function getAllAggregators(): Promise<IAPrompt[]> {
    if (!knex) return []

    const records = await knex('ia_prompt')
        .select('*')
        .where('kind', 'like', '^%')
        .whereNotNull('library')
        .where({ is_latest: 1 })
        .orderBy('id') as IAPrompt[]

    for (const record of records) {
        if (typeof record.content === 'string') record.content = JSON.parse(record.content)
        if (typeof record.workflow === 'string') record.workflow = JSON.parse(record.workflow)
    }

    return records
}

/**
 * Get a display-name map for all aggregator synthesis types: key (without ^) → display name.
 * Used for display in batch pages and other UI components.
 */
export async function getAggregatorNameMap(): Promise<Record<string, string>> {
    const aggregators = await getAllAggregators()
    const map: Record<string, string> = {}
    for (const agg of aggregators) {
        const key = agg.kind.startsWith('^') ? agg.kind.substring(1) : agg.kind
        map[key] = agg.name || key
    }
    return map
}
