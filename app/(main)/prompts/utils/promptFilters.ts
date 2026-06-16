import { IAPromptList } from "@/lib/db/mysql-types"
import { Instance, Matter, Scope } from "@/lib/proc/process-types"
import { slugify } from "@/lib/utils/utils"
import { enumSorted } from "@/lib/ai/model-types"
import devLog from "@/lib/utils/log"

export interface PromptFilters {
    scope?: string
    instance?: string
    matter?: string
}

export function filterPrompts(
    prompts: IAPromptList[],
    filters: PromptFilters
): IAPromptList[] {
    devLog('filterPrompts', { filters, promptsCount: prompts.length })
    const filtered = prompts.filter((p) => {
        devLog('filterPrompts - checking prompt', { promptId: p.id, promptName: p.name, contentScope: p.content?.scope, contentInstance: p.content?.instance, contentMatter: p.content?.matter })
        if (filters.scope && !p.content.scope?.includes(filters.scope)) return false
        if (filters.instance && !p.content.instance?.includes(filters.instance)) return false
        if (filters.matter && !p.content.matter?.includes(filters.matter)) return false
        return true
    })
    devLog('filterPrompts - filtered prompts count', { filteredCount: filtered.length })
    return filtered
}

export function getPromptsPrincipais(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share === 'PADRAO' || p.is_mine)
}

export function getPromptsComunidade(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share !== 'PADRAO' && p.share !== 'OCULTO' && !p.is_mine)
}

export function getPromptsSidekick(
    prompts: IAPromptList[],
    selectedPrompt: IAPromptList | null,
    numeroDoProcesso: string | null,
    instance: string | null,
    action: string | null
): IAPromptList[] {
    const chatIsCurrentPrompt = selectedPrompt?.slug === 'chat' && !!selectedPrompt?.origin

    const chat = prompts.find((p) => p.slug === 'chat' && !!p.origin)
    if (chat) chat.name = 'Chat com Peças Selecionadas'

    const isVisible = (v: string, contextV: string | string[]) => {
        if (!v) return undefined
        if (!contextV) return undefined
        if (Array.isArray(contextV)) {
            return contextV.includes(v)
        } else {
            return contextV === v
        }
    }

    const calcHidden = (...flags: (boolean | undefined)[]) => {
        return flags.some(f => f === false)
    }

    for (const p of prompts) {
        p.is_auto_hidden = true
        
        if (p.origin) {
            const context = p.content?.context
            if (context) {
                const hInstance = isVisible(instance, context?.instance)
                const hAction = isVisible(action || 'minuta_editar', context?.action)
                p.is_auto_hidden = calcHidden(hInstance, hAction)
            }
        }
        if (p.is_favorite) p.is_auto_hidden = false

        if (!p.is_auto_hidden) {
            if (p.slug === 'chat' && !!p.origin && chatIsCurrentPrompt) p.is_auto_hidden = true
            if (p.slug === 'chat-standalone' && !!p.origin && numeroDoProcesso) p.is_auto_hidden = true
        }
    }

    const list = [...prompts]

    list.sort((a, b) => {
        if (a.slug === 'chat-standalone' && !!a.origin && (b.slug !== 'chat-standalone' || !b.origin)) return -1
        if ((a.slug !== 'chat-standalone' || !a.origin) && b.slug === 'chat-standalone' && !!b.origin) return 1
        if (a.slug === 'chat' && !!a.origin && (b.slug !== 'chat' || !b.origin)) return -1
        if ((a.slug !== 'chat' || !a.origin) && b.slug === 'chat' && !!b.origin) return 1
        if (a.is_favorite && !b.is_favorite) return 1
        if (!a.is_favorite && b.is_favorite) return -1
        if (a.name < b.name) return -1
        if (a.name > b.name) return 1
        return 0
    })

    return list
}

export function decodeEnumParam(param: string | null, enumObj: any): string | undefined {
    if (!param) return undefined
    const list = enumSorted(enumObj)
    const direct = list.find((s: any) => s.value?.name === param)?.value?.name
    if (direct) return direct
    const bySlug = list.find((s: any) => slugify(s.value?.name) === param)?.value?.name
    return bySlug
}

export function findPromptFromParam(prompts: IAPromptList[], param: string): IAPromptList | null {
    if (/^\d+$/.test(param)) {
        const n = parseInt(param)
        return prompts.find(pr => pr.base_id === n) || null
    } else {
        return prompts.find(pr => !!pr.origin && pr.slug === param) || null
    }
}
