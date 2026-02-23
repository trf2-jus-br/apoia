import { ContentType } from "../ai/prompt-types"
import { TargetKeys } from "../proc/process-types"
import { devLog } from "./log"
import { ApproveMessageToParentType, SourcePayloadType } from "./messaging"
import { slugify } from "./utils"

// O Eproc não utiliza blockquote, mas sim parágrafos com classe "citacao". 
// Também não usa títulos, mas sim parágrafos com classes "titulo" e "subtitulo".

export const formatHtmlToEprocStandard = (html: string) => {
    // Os parágrafos entre <blockquote> e </blockquote>, marcados com <p> viram <p class="citacao">
    const blockquoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/g
    html = html.replace(blockquoteRegex, (match, p1) => {
        const formattedContent = p1.replace(/<p>/g, '<p class="citacao">')
        return formattedContent
    })
    html = html.replace(/<p>/g, '<p class="paragrafoPadrao">')
    html = html.replace(/<h1[^>]*>/g, '<p class="titulo">')
    html = html.replace(/<h2[^>]*>/g, '<p class="titulo">')
    html = html.replace(/<h3[^>]*>/g, '<p class="subtitulo">')
    html = html.replace(/<\/h1>/g, '</p>')
    html = html.replace(/<\/h2>/g, '</p>')
    html = html.replace(/<\/h3>/g, '</p>')
    html = html.replace(/<span class="citacao"[^>]*>/g, '<span>')
    html = html.replace(/<span class="nao-citacao"[^>]*>/g, '<span>')
    html = html.replace(/<span>([^<]*)<\/span>/g, '$1')
    return html
}

export const formatEprocStandardToHtml = (html: string) => {
    if (!html) return html

    html = html.replace(/&nbsp;/g, ' ')

    // Converte <p class="subtitulo"> de volta para <h3>
    html = html.replace(/<p[^>]*class="[^"]*subtitulo[^"]*"[^>]*>/g, '<h3>')

    // Converte <p class="titulo"> de volta para <h2>
    html = html.replace(/<p[^>]*class="[^"]*titulo[^"]*"[^>]*>/g, '<h2>')

    // Agrupa parágrafos consecutivos com class="citacao" dentro de <blockquote>
    // Primeiro, substitui cada <p class="citacao"> por um marcador temporário
    html = html.replace(/<p[^>]*class="[^"]*(citacao2?|paragrafoComRecuo)[^"]*"[^>]*>/g, '<p class="__citacao__">')

    // Agrupa sequências de parágrafos com class="__citacao__" em blockquotes
    const citacaoGroupRegex = /(<p class="__citacao__">[\s\S]*?<\/p>(?:\s*<p class="__citacao__">[\s\S]*?<\/p>)*)/g
    html = html.replace(citacaoGroupRegex, (match) => {
        const content = match.replace(/<p class="__citacao__">/g, '<p>')
        return `<blockquote>${content}</blockquote>`
    })

    // Converte <p class="paragrafoPadrao"> de volta para <p>
    html = html.replace(/<p[^>]*class="[^"]*paragrafoPadrao[^"]*"[^>]*>/g, '<p>')

    // Fecha as tags h2 e h3 que foram convertidas de </p>
    // Procura por </p> que vem depois de <h2> ou <h3>
    html = html.replace(/<h2>([\s\S]*?)<\/p>/g, '<h2>$1</h2>')
    html = html.replace(/<h3>([\s\S]*?)<\/p>/g, '<h3>$1</h3>')

    return html
}

export const sendApproveMessageToParent = (content: ContentType, sourcePayload: SourcePayloadType | null, promptSlug?: string, promptType?: TargetKeys) => {
    devLog('onApprove content:', content)
    if (content) {
        let htmlContent = formatHtmlToEprocStandard(content.formatted || '')
        window.parent.postMessage({
            type: 'approved',
            payload: {
                promptSlug,
                promptType: promptType ? slugify(promptType) : undefined,
                markdownContent: content.raw,
                htmlContent,
                sourcePayload
            }
        } satisfies ApproveMessageToParentType, '*')
    }
}
