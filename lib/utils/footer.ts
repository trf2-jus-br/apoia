import { TextoType } from "../ai/prompt-types"
import { identificarSituacaoDaPeca } from "../proc/process-types"
import { PecaType } from "../proc/process-types"
import { slugify } from "./utils"

export const buildFooterFromPieces = (model: string, selectedPieces: PecaType[]): string => {
    const pecasComConteudo: TextoType[] = []
    for (const peca of selectedPieces) {
        const slug = slugify(peca.descr)
        pecasComConteudo.push({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug, texto: peca.conteudo, sigilo: peca.sigilo })
    }
    return buildFooter(model, pecasComConteudo)
}

export const buildFooter = (model: string, pecasComConteudo: TextoType[]): string => {
    let pecasStr = ''
    if (pecasComConteudo?.length) {
        const pecasNomes = pecasComConteudo.map(p => {
            const { sigilosa, inacessivel, parcial, vazia } = identificarSituacaoDaPeca(p.texto)
            return `<span class="${sigilosa ? 'peca-sigilosa' : inacessivel ? 'peca-inacessivel' : parcial ? 'peca-parcial' : vazia ? 'peca-vazia' : ''}">${p.descr?.toLowerCase()} (e.${p.event}${sigilosa ? ', sigilosa' : inacessivel ? ', inacessível' : parcial ? ', parcial' : vazia ? ', vazia' : ''})</span>`
        })
        if (pecasNomes.length === 1) {
            pecasStr = pecasNomes[0]
        } else if (pecasNomes.length > 1) {
            const last = pecasNomes.pop()
            pecasStr = `${pecasNomes.join(', ')} e ${last}`;
        }
    }
    const info = `Utilizou o modelo ${model}${pecasStr ? ` e acessou as peças: ${pecasStr}` : ''}.`
    return info
}

