import { cookies } from 'next/headers'
import { PromptDao } from './db/dao'
import { IAPromptList } from './db/mysql-types'
import { Instance, Matter, Scope, Share, StatusDeLancamento } from './proc/process-types'

/**
 * Synchronizes internal prompts in database.
 * Builds a lookup map of aggregator prompts (kind starts with ^).
 * Library-sourced prompts from the sync engine are the source of truth.
 * Non-library seed records are kept for backward compatibility but
 * origin-sourced records are preferred when both exist for the same kind.
 */
async function syncInternalPrompts(basePrompts: IAPromptList[]): Promise<Map<string, IAPromptList>> {
    const baseBySlug = new Map<string, IAPromptList>()
    for (const p of basePrompts) {
        if (p.origin) {
            // Prefer origin-sourced records over old seeds
            const existing = baseBySlug.get(p.slug)
            if (!existing || (p.origin && !existing.origin)) {
                baseBySlug.set(p.slug, p)
            }
        }
    }

    return baseBySlug
}

/**
 * Builds list of visible prompts from aggregator records in the database.
 * All metadata (status, author, target, scope, instance, matter, grupo)
 * comes from the DB content fields populated by the sync engine.
 */
async function buildVisiblePrompts(
    baseBySlug: Map<string, IAPromptList>, 
    isBetaTester: boolean, 
    showChatPadrao: boolean
): Promise<IAPromptList[]> {
    const seededOverlay: IAPromptList[] = []
    
    for (const [slug, base] of baseBySlug.entries()) {
        // Skip CHAT_STANDALONE if not showing chat padrão
        if (!showChatPadrao && slug === 'CHAT_STANDALONE') continue
        
        // Determine status from DB metadata
        const dbStatus = base.content?.status
        const status = dbStatus === 'publico' ? StatusDeLancamento.PUBLICO : StatusDeLancamento.EM_DESENVOLVIMENTO
        
        // Skip development features for non-beta testers
        if (status === StatusDeLancamento.EM_DESENVOLVIMENTO && !isBetaTester) continue

        const over: IAPromptList = {
            ...base,
            name: base.name || slug,
            content: {
                ...base.content,
                author: base.content?.author || '-',
                target: base.content?.target || 'PROCESSO',
                scope: base.content?.scope?.length ? base.content.scope : Object.keys(Scope),
                instance: base.content?.instance?.length ? base.content.instance : Object.keys(Instance),
                matter: base.content?.matter?.length ? base.content.matter : Object.keys(Matter),
            },
            share: status === StatusDeLancamento.EM_DESENVOLVIMENTO ? Share.NAO_LISTADO.name : Share.PADRAO.name,
            // Defaults when coming from `seed` (not in base list)
            is_internal: true,
            is_mine: false,
            is_favorite: (base as any).is_favorite ?? 0,
            favorite_count: (base as any).favorite_count ?? 0,
        }
        seededOverlay.push(over)
    }

    return seededOverlay
}

/**
 * Main function that orchestrates prompt list processing
 */
export async function fixPromptList(basePrompts: IAPromptList[], showChatPadrao = false, isBetaTester?: boolean): Promise<IAPromptList[]> {
    // Determine beta tester cookie (only if not provided as parameter)
    if (isBetaTester === undefined) {
        const cookieStore = await cookies()
        const betaCookie = cookieStore.get('beta-tester')?.value
        isBetaTester = betaCookie === '2'
    }

    // Step 1: Sync internal prompts with database
    const syncedPrompts = await syncInternalPrompts(basePrompts)
    
    // Step 2: Build visible prompts list
    const seededOverlay = await buildVisiblePrompts(syncedPrompts, isBetaTester, showChatPadrao)
    
    // Step 3: Combine with non-seeded prompts and sort
    const nonSeeded = basePrompts.filter(p => !p.origin)
    const prompts: IAPromptList[] = [...nonSeeded, ...seededOverlay]

    prompts.sort((a, b) => {
        if (!!a.is_favorite > !!b.is_favorite) return -1
        if (!!a.is_favorite < !!b.is_favorite) return 1
        if (parseIntSafe(a.favorite_count) > parseIntSafe(b.favorite_count)) return -1
        if (parseIntSafe(a.favorite_count) < parseIntSafe(b.favorite_count)) return 1
        if (a.is_mine > b.is_mine) return -1
        if (a.is_mine < b.is_mine) return 1
        if (a.is_internal && !b.is_internal) return -1
        if (!a.is_internal && b.is_internal) return 1
        if (a.created_at > b.created_at) return -1
        if (a.created_at < b.created_at) return 1
        return 0
    })

    return prompts
}

const parseIntSafe = (s: any): number => {
    const n = parseInt(s)
    if (isNaN(n)) return 0
    return n
}

