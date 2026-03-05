import { cookies } from 'next/headers'
import { PromptDao } from './db/dao'
import { IAPromptList } from './db/mysql-types'
import { TipoDeSinteseMap } from './proc/combinacoes'
import { Instance, Matter, Scope, Share, StatusDeLancamento } from './proc/process-types'

/**
 * Checks if an aggregator record from the sync engine already exists for the given kind.
 * Aggregators are library-sourced prompts (library IS NOT NULL) that act as orchestrators.
 */
function hasLibraryAggregator(basePrompts: IAPromptList[], kind: string): boolean {
    return basePrompts.some(p => p.kind === kind && p.library)
}

/**
 * Synchronizes internal prompts in database based on TipoDeSinteseMap.
 * Only manages product-type prompts (library IS NULL). Library-sourced prompts
 * from the sync engine are not touched here.
 * 
 * Skips creation of seeds when a library-based aggregator with the same kind
 * already exists (from the sync engine processing aggregator .md files).
 */
async function syncInternalPrompts(basePrompts: IAPromptList[]): Promise<Map<string, IAPromptList>> {
    const baseByKind = new Map<string, IAPromptList>()
    for (const p of basePrompts) {
        if (p.kind?.startsWith('^')) {
            baseByKind.set(p.kind, p)
        }
    }

    // Ensure all prompts from TipoDeSinteseMap exist in database
    // Skip if a library-based aggregator already exists for this kind
    const allMapKeys = Object.keys(TipoDeSinteseMap)
    for (const key of allMapKeys) {
        const kind = `^${key}`
        if (!baseByKind.has(kind) && !hasLibraryAggregator(basePrompts, kind)) {
            const newPrompt = await PromptDao.addInternalPrompt(kind) as IAPromptList
            baseByKind.set(kind, newPrompt)
        }
    }

    // Remove prompts that no longer exist in TipoDeSinteseMap
    // ONLY for non-library prompts (library IS NULL). Library prompts are
    // managed exclusively by the sync engine in instrumentation.ts.
    const validKinds = new Set(allMapKeys.map(k => `^${k}`))
    for (const [kind, prompt] of baseByKind.entries()) {
        if (!validKinds.has(kind) && !prompt.library) {
            await PromptDao.removeInternalPrompt(kind)
            baseByKind.delete(kind)
        }
    }

    return baseByKind
}

/**
 * Builds list of visible prompts with overlays based on user permissions and settings.
 * Prefers metadata from aggregator records in the database (synced from .md files)
 * over hardcoded TipoDeSinteseMap display fields.
 */
async function buildVisiblePrompts(
    baseByKind: Map<string, IAPromptList>, 
    isBetaTester: boolean, 
    showChatPadrao: boolean
): Promise<IAPromptList[]> {
    const seededOverlay: IAPromptList[] = []
    
    for (const key of Object.keys(TipoDeSinteseMap)) {
        const def = TipoDeSinteseMap[key]
        
        // Skip CHAT_STANDALONE if not showing chat padrão
        if (!showChatPadrao && key === 'CHAT_STANDALONE') continue
        
        const base = baseByKind.get(`^${key}`)
        if (!base) continue // Should not happen after sync, but defensive programming

        // Determine status: prefer DB metadata, fall back to TipoDeSinteseMap
        const dbStatus = base.content?.status
        const status = dbStatus
            ? (dbStatus === 'publico' ? StatusDeLancamento.PUBLICO : StatusDeLancamento.EM_DESENVOLVIMENTO)
            : def.status
        
        // Skip development features for non-beta testers
        if (status === StatusDeLancamento.EM_DESENVOLVIMENTO && !isBetaTester) continue

        // Use DB metadata when available (from aggregator .md METADATA), fall back to TipoDeSinteseMap
        const hasDbMeta = base.library != null  // library-sourced record has richer metadata

        const over: IAPromptList = {
            ...base,
            name: hasDbMeta ? (base.name || def.nome) : def.nome,
            content: {
                ...base.content,
                author: (hasDbMeta ? base.content?.author : def.author) || '-',
                target: (hasDbMeta ? base.content?.target : def.target) || 'PROCESSO',
                scope: (hasDbMeta ? base.content?.scope : def.scope)?.length ? (hasDbMeta ? base.content.scope : def.scope) : Object.keys(Scope),
                instance: (hasDbMeta ? base.content?.instance : def.instance)?.length ? (hasDbMeta ? base.content.instance : def.instance) : Object.keys(Instance),
                matter: (hasDbMeta ? base.content?.matter : def.matter)?.length ? (hasDbMeta ? base.content.matter : def.matter) : Object.keys(Matter),
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
    const nonSeeded = basePrompts.filter(p => !p.kind?.startsWith('^'))
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

