import { TextoType } from "../ai/prompt-types"
import { TEXTO_INDICACAO_PARCIAL, TEXTO_PECA_COM_ERRO, TEXTO_PECA_IMAGEM_JPEG, TEXTO_PECA_IMAGEM_PNG, TEXTO_PECA_PDF_OCR_ERRO, TEXTO_PECA_PDF_OCR_VAZIO, TEXTO_PECA_SIGILOSA, TEXTO_PECA_VIDEO_MP4, TEXTO_PECA_VIDEO_XMS_WMV } from "../proc/process-types"
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
            const sigilosa = p.texto === TEXTO_PECA_SIGILOSA
            const inacessivel = p.texto?.startsWith(TEXTO_PECA_COM_ERRO) || p.texto === TEXTO_PECA_PDF_OCR_ERRO
            const vazia = !p.texto || p.texto === TEXTO_PECA_IMAGEM_JPEG || p.texto === TEXTO_PECA_IMAGEM_PNG || p.texto === TEXTO_PECA_VIDEO_XMS_WMV || p.texto === TEXTO_PECA_VIDEO_MP4 || p.texto === TEXTO_PECA_PDF_OCR_VAZIO
            const parcial = p.texto?.endsWith(TEXTO_INDICACAO_PARCIAL)
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

