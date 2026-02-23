import { IAPromptList } from "@/lib/db/mysql-types"
import { Instance, Matter, Scope } from "@/lib/proc/process-types"
import { slugify } from "@/lib/utils/utils"
import { enumSorted } from "@/lib/ai/model-types"
import { TipoDeSinteseMap } from "@/lib/proc/combinacoes"

export interface PromptFilters {
    scope?: string
    instance?: string
    matter?: string
}

export function filterPrompts(
    prompts: IAPromptList[],
    filters: PromptFilters
): IAPromptList[] {
    return prompts.filter((p) => {
        if (filters.scope && !p.content.scope?.includes(filters.scope)) return false
        if (filters.instance && !p.content.instance?.includes(filters.instance)) return false
        if (filters.matter && !p.content.matter?.includes(filters.matter)) return false
        return true
    })
}

export function getPromptsPrincipais(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share === 'PADRAO' || p.is_mine)
}

export function getPromptsComunidade(prompts: IAPromptList[]): IAPromptList[] {
    return prompts.filter((p) => p.share !== 'PADRAO' && !p.is_mine)
}

export function getPromptsSidekick(
    prompts: IAPromptList[],
    selectedPrompt: IAPromptList | null,
    numeroDoProcesso: string | null,
    instance: string | null,
    action: string | null
): IAPromptList[] {
    const chatIsCurrentPrompt = selectedPrompt?.kind === '^CHAT'

    const chat = prompts.find((p) => p.kind === '^CHAT')
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
        if (p.kind?.startsWith('^')) {
            const tipoDeSintese = TipoDeSinteseMap[p.kind.substring(1)]
            if (tipoDeSintese && tipoDeSintese.context) {
                const hInstance = isVisible(instance, tipoDeSintese.context?.instance)
                // console.log('Prompt', p.name, 'instance visibility:', hInstance)
                const hAction = isVisible(action, tipoDeSintese.context?.action)
                p.is_hidden = calcHidden(hInstance, hAction)
            }
            if (p.is_favorite) p.is_hidden = false
        }

        if (!p.is_hidden) {
            if (p.kind === '^CHAT' && chatIsCurrentPrompt) p.is_hidden = true
            if (p.kind === '^CHAT_STANDALONE' && numeroDoProcesso) p.is_hidden = true
        }
    }

    const list = [...prompts]

    list.sort((a, b) => {
        if (a.kind === '^CHAT_STANDALONE' && b.kind !== '^CHAT_STANDALONE') return -1
        if (a.kind !== '^CHAT_STANDALONE' && b.kind === '^CHAT_STANDALONE') return 1
        if (a.kind === '^CHAT' && b.kind !== '^CHAT') return -1
        if (a.kind !== '^CHAT' && b.kind === '^CHAT') return 1
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
        return prompts.find(pr => pr.kind?.startsWith('^') && slugify(pr.kind.substring(1)) === param) || null
    }
}
