import showdown from 'showdown'
import { P } from '../proc/combinacoes'
import { PromptDataType, PromptDefinitionType, TextoType } from '../ai/prompt-types'
import { diff as mddiff, diffAndCollapse as diffAndCompact } from './mddiff'
import { format as libFormat } from '../ai/format'

import diff from 'diff-htmls';

const divExtension = () => [{
  type: 'output',
  regex: /<!--(<.*>)-->/g,
  replace: '$1'
}]

const converter = new showdown.Converter({ tables: true, extensions: [divExtension] })

export const enum VisualizationEnum {
    DIFF,
    DIFF_COMPACT,
    DIFF_HIGHLIGHT_INCLUSIONS,
    TEXT_EDITED,
    TEXT_ORIGINAL
}

export const Visualization = [
    { id: VisualizationEnum.DIFF, descr: 'Diferença' },
    { id: VisualizationEnum.DIFF_COMPACT, descr: 'Diferença Compacta' },
    { id: VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS, descr: 'Destacar Inclusões' },
    { id: VisualizationEnum.TEXT_EDITED, descr: 'Texto Editado' },
    { id: VisualizationEnum.TEXT_ORIGINAL, descr: 'Texto Original' }
]

export const filterText = (text) => {
    // if text is an array os strings, join them
    if (Array.isArray(text)) {
        text = text.join('')
    }
    let s = text

    if (s.includes('<scratchpad>'))
        s = s.split('<scratchpad>')[1]
    if (s.includes('</scratchpad>'))
        s = s.split('</scratchpad>')[1]
    if (s.includes('<result>'))
        s = s.split('<result>')[1]
    if (s.includes('</result>'))
        s = s.split('</result>')[0]
    s = s
    return s.trim()
}

export const buildTemplateMap = (template: string) => {
    const templateMap = {}
    const regex = /<(snippet|if)\s+id="([^"]*)"\s+expr="([^"]+)"\s*\/?>/g
    let match
    while ((match = regex.exec(template)) !== null) {
        const id = match[2]
        const expr = match[3]
        templateMap[id] = expr
    }
    return templateMap
}

export const diffTable = (template: string, text: string) => {
    const templateMap = buildTemplateMap(template)

    let table = `<table class="diff-table table table-sm table-striped">
        <thead class="table-dark">
            <tr>
                <th>#</th>
                <th>Expressão</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Justificativa</th>
            </tr>
        </thead>
        <tbody>`

    const matches: { fullMatch: string, type: string, id: string, justification: string, value: string }[] = []
    const regex = /<(snippet)\s+id="([^"]*)"\s+justification="([^"]*)"\s*(?:\/>|>(.*?)<\/\1>)/gs
    const addToMatches = (regex: RegExp, text: string) => {
        for (const match of text.matchAll(regex)) {
            const [fullMatch, type, id, justification, value] = match
            matches.push({ fullMatch, type, id, justification, value: (value || '').trim() })
        }
    }
    addToMatches(/<(snippet)\s+id="([^"]*)"\s+justification="([^"]*)"\s*(?:\/>|>(.*?)<\/\1>)/gs, text)
    addToMatches(/<(if)\s+id="([^"]*)"\s+justification="([^"]*)"\s*(?:\/>|>(.*?)<\/\1>)/gs, text)
    matches.sort((a, b) => {
        const idA = parseInt(a.id.replace('x', ''))
        const idB = parseInt(b.id.replace('x', ''))
        return idA - idB
    })
    for (const match of matches) {
        table += `<tr>
                <td>${match.id}</td>
                <td>${templateMap[match.id]}</td>
                <td>${match.type === 'snippet' ? 'Inclusão' : match.type === 'if' ? 'Condicional' : match.type}</td>
                <td>${match.value}</td>
                <td>${match.justification}</td>
            </tr>`
    }

    table += `</tbody></table>`
    return table
}

const limparMarcadoresDeIfESnippet = (texto: string) => {
    let limpo = texto.replace(/<(snippet|if)[^>]*>/g, '')
    limpo = limpo.replace(/<\/(snippet|if)>/g, '')
    return limpo
}

const limparDiff = (d: string) => {
    d = d.replace(/"diff(ins|del|mod)"/g, '"diff$1-highlight"')
    d = d.replace(/<del[^>]*>.*?<\/del>/gs, '~')
    d = d.replace(/<(strong|em)>\s*~\s*<\/\1>/gs, '~')
    d = d.replace(/<p>(\s*~)+\s*<\/p>/gs, '')
    d = d.replace(/<\/(p)>(\s*~)+\s*<p>/gs, '</p><p>')
    while (true) {
        const c = d.replace(/<\/p>\s*<p>(?:\s*~)+([^~\s].*?)<\/p>/gs, '$1</p>')
        if (c == d) break
        d = c
    }
    d = d.replace(/~/g, '')

    // remove spaces inside <ins> to be compatible with Siga-Doc html2pdf webservice
    d = d.replace(/(<ins[^>]*>)(\s*)(.*?)(\s*)<\/ins>/gs, '$2$1$3</ins>$4')
    return d
}

export type PreprocessReturnType = {
    text: string
    templateTable?: string
}

export const preprocess = (text: string, definition: PromptDefinitionType, data: PromptDataType, complete: boolean, visualization?: VisualizationEnum, diffSource?: string): PreprocessReturnType => {
    text = filterText(text)

    if (definition.format)
        text = libFormat(definition.format, text)

    if (complete && visualization !== undefined) {
        const textoOriginal = (diffSource !== undefined ? diffSource : data?.textos?.[0]?.texto) ?? ''

        // text = text.replace(/<snippet>/g, '[').replace(/<\/snippet>/g, ']')

        const blocksExpression = [
            { exp: /\<snippet id="\d+x?" justification="[^"]*?"\s?\/\>/g },
            { exp: /\<snippet id="\d+x?" justification="[^"]*?"\>(.*?)\<\/snippet\>/g },
            { exp: /\<if id="\d+x?" justification="[^"]*?"\s?\/\>/g },
            { exp: /\<if id="\d+x?" justification="[^"]*?"\>(.*?)\<\/if\>/g },
        ]

        switch (visualization) {
            case VisualizationEnum.DIFF:
                // return converter.makeHtml(mddiff(texto as string, text, true))
                return { text: diff(converter.makeHtml(textoOriginal as string), converter.makeHtml(text), { blocksExpression }) }
            case VisualizationEnum.DIFF_COMPACT:
                return { text: converter.makeHtml(diffAndCompact(textoOriginal as string, text)) }
            case VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS: {
                // console.log('textoOriginal', textoOriginal)
                // console.log('textoResultado', text)
                const textoOriginalLimpo = limparMarcadoresDeIfESnippet(textoOriginal as string)
                const textoResultadoLimpo = limparMarcadoresDeIfESnippet(text)
                let d = diff(converter.makeHtml(textoOriginalLimpo), converter.makeHtml(textoResultadoLimpo), { blocksExpression })
                const diffLimpo = limparDiff(d)
                return { text: diffLimpo, templateTable: textoOriginal.includes('<snippet ') ? diffTable(textoOriginal as string, text) : undefined }
            }
            case VisualizationEnum.TEXT_EDITED:
                return { text: converter.makeHtml(text) }
            case VisualizationEnum.TEXT_ORIGINAL:
                return { text: converter.makeHtml(textoOriginal as string) }
        }
    }

    text = converter.makeHtml(text)
    // console.log(`Preprocessed text: ${text}`) // Debugging output
    return { text }
}

