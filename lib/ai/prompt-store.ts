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
        kind: record.slug || record.category || '',
        name: record.name || undefined,
        isSeeded: !!record.origin,
        systemPrompt: content?.system_prompt || undefined,
        prompt: content?.prompt || undefined,
        jsonSchema: content?.json_schema || undefined,
        format: content?.format || undefined,
        template: content?.template || undefined,
        metadata: {
            author: content?.author || undefined,
            target: content?.target || undefined,
            profile: content?.profile || undefined,
            group: content?.group || undefined,
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

    // Try to find origin prompt by slug
    let record = await knex('ia_prompt')
        .select('*')
        .where({ slug, is_latest: 1 })
        .whereNotNull('origin')
        .first() as IAPrompt | undefined

    // Fallback: try with underscore variant
    const slugUnderscore = slug.replace(/-/g, '_')
    if (!record && slugUnderscore !== slug) {
        record = await knex('ia_prompt')
            .select('*')
            .where({ slug: slugUnderscore, is_latest: 1 })
            .whereNotNull('origin')
            .first() as IAPrompt | undefined
    }

    // Fallback: resumo-* variants → resumo-peca
    if (!record && slug.startsWith('resumo-')) {
        record = await knex('ia_prompt')
            .select('*')
            .where({ slug: 'resumo-peca', is_latest: 1 })
            .whereNotNull('origin')
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
 * Used for prompts created via the UI (origin IS NULL).
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
 * Get all seeded prompt slugs (for listing/UI).
 * Returns unique slugs from prompts where origin IS NOT NULL and is_latest = 1.
 */
export async function getLibraryPromptSlugs(): Promise<string[]> {
    if (!knex) return []

    const records = await knex('ia_prompt')
        .select('slug')
        .whereNotNull('origin')
        .where({ is_latest: 1 })

    return records
        .map((r: any) => r.slug as string)
        .filter(Boolean)
}

/**
 * Get an aggregator prompt record by its slug.
 * Aggregators are library-sourced records with workflow successors and metadata
 * but no system_prompt / prompt content.
 * 
 * @param slug - The prompt slug (e.g., 'MINUTA_DE_SENTENCA')
 * @returns The IAPrompt record with content (including workflow), or null if not found
 */
export async function getAggregatorByKind(slug: string): Promise<IAPrompt | null> {
    if (!knex) return null

    const record = await knex('ia_prompt')
        .select('*')
        .where({ slug, is_latest: 1 })
        .whereNotNull('origin')
        .first() as IAPrompt | undefined

    if (!record) return null

    // Parse content if stored as string
    if (typeof record.content === 'string') {
        record.content = JSON.parse(record.content)
    }

    return record
}

/**
 * Get the first non-chat successor prompt slug from an aggregator's workflow.
 * Used to determine the "main" prompt for an internal synthesis type.
 * 
 * @param slug - The aggregator slug
 * @returns The slug of the first non-chat successor, or null
 */
export async function getFirstProductSlug(slug: string): Promise<string | null> {
    const aggregator = await getAggregatorByKind(slug)
    if (!aggregator?.content?.workflow?.successors?.length) return null

    for (const step of aggregator.content.workflow.successors) {
        const def = await getPromptDefinitionByUuid(step.uuid).catch(() => null)
        if (!def) continue
        // Skip chat prompts — we want the main product prompt
        if (def.kind === 'chat' || def.kind === 'chat-standalone') continue
        return def.kind
    }
    return null
}

/**
 * Get all aggregator records (origin-sourced, is_latest=1).
 * Returns full IAPrompt records with parsed content and workflow.
 */
export async function getAllAggregators(): Promise<IAPrompt[]> {
    if (!knex) return []

    const records = await knex('ia_prompt')
        .select('*')
        .whereNotNull('origin')
        .where({ is_latest: 1 })
        .orderBy('id') as IAPrompt[]

    // Filter to only aggregator records (those with workflow in content)
    const aggregators: IAPrompt[] = []
    for (const record of records) {
        if (typeof record.content === 'string') record.content = JSON.parse(record.content)
        if (record.content?.workflow) aggregators.push(record)
    }

    return aggregators
}

/**
 * Get a display-name map for all aggregator synthesis types: key (without ^) → display name.
 * Used for display in batch pages and other UI components.
 */
export async function getAggregatorNameMap(): Promise<Record<string, string>> {
    const aggregators = await getAllAggregators()
    const map: Record<string, string> = {}
    for (const agg of aggregators) {
        const key = agg.slug
        map[key] = agg.name || key
    }
    return map
}
