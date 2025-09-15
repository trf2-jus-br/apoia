import { cookies } from 'next/headers'
import { Dao } from './db/mysql'
import { IAPromptList } from './db/mysql-types'
import { TipoDeSinteseMap } from './proc/combinacoes'
import { Instance, Matter, Scope, Share, StatusDeLancamento } from './proc/process-types'

export async function fixPromptList(basePrompts: IAPromptList[]) {

    // Determine beta tester cookie
    const cookieStore = await cookies()
    const betaCookie = cookieStore.get('beta-tester')?.value
    const isBetaTester = betaCookie === '2'

    // Build overlay list for seeds based on map status and beta gating
    const baseByKind = new Map<string, IAPromptList>()
    for (const p of basePrompts) if (p.kind?.startsWith('^')) baseByKind.set(p.kind, p)

    const visibleKeys = Object.keys(TipoDeSinteseMap).filter(k => {
        const def = TipoDeSinteseMap[k]
        return def.status === StatusDeLancamento.PUBLICO || (def.status === StatusDeLancamento.EM_DESENVOLVIMENTO && isBetaTester)
    })
    const visibleKinds = new Set(visibleKeys.map(k => `^${k}`))

    // Convert seeded (possibly missing from base list) into IAPromptList shape and overlay display info
    const seededOverlay: IAPromptList[] = []
    for (const key of Object.keys(TipoDeSinteseMap)) {
        const def = TipoDeSinteseMap[key]
        const base = baseByKind.get(`^${key}`)
            ? baseByKind.get(`^${key}`)
            : await Dao.addInternalPrompt(`^${key}`) as IAPromptList
        if (def.status === StatusDeLancamento.EM_DESENVOLVIMENTO && !isBetaTester) {
            baseByKind.delete(`^${key}`)
            continue
        }
        // Overlay display fields: name and filters (content.*)
        const over: IAPromptList = {
            ...base,
            name: def.nome,
            // Ensure content exists
            content: {
                ...base.content,
                author: def.author || '-',
                target: 'PROCESSO',
                scope: def.scope?.length ? def.scope : Object.keys(Scope),
                instance: def.instance?.length ? def.instance : Object.keys(Instance),
                matter: def.matter?.length ? def.matter : Object.keys(Matter),
            },
            share: def.status === StatusDeLancamento.EM_DESENVOLVIMENTO ? Share.NAO_LISTADO.name : Share.PADRAO.name,
            // Defaults when coming from `seed` (not in base list)
            is_internal: true,
            is_mine: false,
            is_favorite: (base as any).is_favorite ?? 0,
            favorite_count: (base as any).favorite_count ?? 0,
        }
        seededOverlay.push(over)
        baseByKind.delete(`^${key}`) // Mark as processed
    }

    // Remove seeded entries that no longer exist in the map
    for (const k of baseByKind.keys()) {
        await Dao.removeInternalPrompt(k)
        baseByKind.delete(k)
    }

    // Non-seeded prompts from base list
    const nonSeeded = basePrompts.filter(p => !p.kind?.startsWith('^'))
    // Merge and sort
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

