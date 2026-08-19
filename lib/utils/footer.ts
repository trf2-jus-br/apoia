import { TextoType } from "../ai/prompt-types"
import { identificarSituacaoDaPeca } from "../proc/process-types"
import { PecaType } from "../proc/process-types"
import { slugify } from "./utils"
import { escapeHtml } from "../ui/sanitize-html"

const normalizeModels = (model: string | string[]): string[] => Array.from(new Set((Array.isArray(model) ? model : [model]).filter(Boolean)))

const joinWithAnd = (items: string[]): string => {
    if (items.length <= 1) return items[0] || ''
    if (items.length === 2) return `${items[0]} e ${items[1]}`
    const last = items[items.length - 1]
    return `${items.slice(0, -1).join(', ')} e ${last}`
}

const buildModelInfo = (model: string | string[]): string => {
    const models = normalizeModels(model)
    if (models.length === 0) return 'Utilizou um modelo não informado'
    if (models.length === 1) return `Utilizou o modelo ${models[0]}`
    return `Utilizou os modelos ${joinWithAnd(models)}`
}

export const buildFooterFromPieces = (model: string | string[], selectedPieces: PecaType[]): string => {
    const pecasComConteudo: TextoType[] = []
    for (const peca of selectedPieces) {
        const slug = slugify(peca.descr)
        pecasComConteudo.push({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug, texto: peca.conteudo, sigilo: peca.sigilo })
    }
    return buildFooter(model, pecasComConteudo)
}

export const buildFooter = (model: string | string[], pecasComConteudo: TextoType[]): string => {
    let pecasStr = ''
    if (pecasComConteudo?.length) {
        const pecasNomes = pecasComConteudo.map(p => {
            const { sigilosa, inacessivel, parcial, vazia, explicacao } = identificarSituacaoDaPeca(p.texto)
            return `<span title="${escapeHtml(explicacao)}" class="${sigilosa ? 'peca-sigilosa' : inacessivel ? 'peca-inacessivel' : parcial ? 'peca-parcial' : vazia ? 'peca-vazia' : ''}">${escapeHtml(p.descr?.toLowerCase())} (e.${escapeHtml('' + p.event)}${sigilosa ? ', sigilosa' : inacessivel ? ', inacessível' : parcial ? ', parcial' : vazia ? ', vazia' : ''})</span>`
        })
        if (pecasNomes.length === 1) {
            pecasStr = pecasNomes[0]
        } else if (pecasNomes.length > 1) {
            const last = pecasNomes.pop()
            pecasStr = `${pecasNomes.join(', ')} e ${last}`;
        }
    }
    const info = `${buildModelInfo(model)}${pecasStr ? ` e acessou as peças: ${pecasStr}` : ''}.`
    return info
}

