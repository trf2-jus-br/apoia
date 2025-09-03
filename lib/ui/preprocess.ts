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

const makeHtml = (text: string) => {
    let html = converter.makeHtml(text)

    // ensure plain <table> gets bootstrap classes
    html = html.replace(/<table\s*>/g, '<table class="table table-striped table-info table-sm">')

    return html
}

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

const compactarDiff = (html: string): string => {
    // Remove espaços em branco e quebras de linha desnecessárias
    if (!html) return html
    return html.replace(
        /(?:<del class="diff[a-z]+">([^<]+?)<\/del><ins class="diff[a-z]+">([^<]+?)<\/ins>)/g,
        '<span class="replaceInline" title="$1">$2</span>'
    )
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
                return { text: diff(makeHtml(textoOriginal as string), makeHtml(text), { blocksExpression }) }
            case VisualizationEnum.DIFF_COMPACT:
                return { text: compactarDiff(diff(makeHtml(textoOriginal as string), makeHtml(text), { blocksExpression })) }
            case VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS: {
                // console.log('textoOriginal', textoOriginal)
                // console.log('textoResultado', text)
                const textoOriginalLimpo = limparMarcadoresDeIfESnippet(textoOriginal as string)
                const textoResultadoLimpo = limparMarcadoresDeIfESnippet(text)
                let d = diff(makeHtml(textoOriginalLimpo), makeHtml(textoResultadoLimpo), { blocksExpression })
                const diffLimpo = limparDiff(d)
                return { text: diffLimpo, templateTable: textoOriginal.includes('<snippet ') ? diffTable(textoOriginal as string, text) : undefined }
            }
            case VisualizationEnum.TEXT_EDITED:
                return { text: makeHtml(text) }
            case VisualizationEnum.TEXT_ORIGINAL:
                return { text: makeHtml(textoOriginal as string) }
        }
    }

    text = makeHtml(text)

    // Replace all <!-- add: ... --> with the addition (the content after <!-- add: and before -->)
    text = text.replace(/<!--\s*add:\s*([\s\S]+?)-->/g, (_, addition) => addition.trim());

    // console.log(`Preprocessed text: ${text}`) // Debugging output

    // Replicate <ins...> inside first-level <p>, <ul>, <ol> children and remove the outer <ins>
    // If top-level children are not exclusively those elements, leave the <ins> unchanged.
    text = wrapInsTags(text)
    
    
    return { text }
}

function wrapInsTags(text: string) {
    const splitTopLevelNodes = (html: string): string[] => {
        const nodes: string[] = []
        let pos = 0
        const len = html.length
        while (pos < len) {
            if (html.startsWith('<!--', pos)) {
                const end = html.indexOf('-->', pos + 4)
                const endIdx = end === -1 ? len : end + 3
                nodes.push(html.slice(pos, endIdx))
                pos = endIdx
                continue
            }
            if (html[pos] !== '<') {
                const next = html.indexOf('<', pos)
                const end = next === -1 ? len : next
                nodes.push(html.slice(pos, end))
                pos = end
                continue
            }
            // starts with '<'
            const openerMatch = html.slice(pos).match(/^<\s*([a-zA-Z0-9\-]+)/)
            if (!openerMatch) {
                // malformed; take until next '<' or end
                const next = html.indexOf('<', pos + 1)
                const end = next === -1 ? len : next
                nodes.push(html.slice(pos, end))
                pos = end
                continue
            }
            const tag = openerMatch[1]
            const openEnd = html.indexOf('>', pos)
            if (openEnd === -1) {
                nodes.push(html.slice(pos))
                break
            }
            // detect self-closing (naive) or void elements
            const voidOrSelfClosing = /\/>\s*$/.test(html.slice(pos, openEnd + 1)) ||
                /^(br|img|hr|meta|input|link|source|track|area|base|col|embed|param)$/i.test(tag)
            if (voidOrSelfClosing) {
                nodes.push(html.slice(pos, openEnd + 1))
                pos = openEnd + 1
                continue
            }
            // find matching closing tag, accounting for nested same tags
            const reTag = /<\/?([a-zA-Z0-9\-]+)[^>]*>/g
            reTag.lastIndex = openEnd + 1
            let depth = 1
            let match
            while ((match = reTag.exec(html)) !== null) {
                const name = match[1]
                const isClose = html[match.index + 1] === '/'
                if (name.toLowerCase() === tag.toLowerCase()) {
                    depth += isClose ? -1 : 1
                }
                if (depth === 0) {
                    const endIdx = reTag.lastIndex
                    nodes.push(html.slice(pos, endIdx))
                    pos = endIdx
                    break
                }
            }
            if (depth !== 0) {
                // no proper closing found; take rest
                nodes.push(html.slice(pos))
                break
            }
        }
        return nodes
    }

    text = text.replace(/<ins([^>]*)>([\s\S]*?)<\/ins>/gs, (full, insAttrs, inner) => {
        // Split into top-level nodes (preserve whitespace/comments)
        const nodes = splitTopLevelNodes(inner)

        // Determine non-whitespace, non-comment top-level nodes
        const significant = nodes.filter(n => {
            if (/^\s*$/s.test(n)) return false
            if (/^<!--[\s\S]*-->$/s.test(n)) return false
            return true
        })

        // If no significant top-level nodes, leave unchanged
        if (significant.length === 0) return full

        const allowed = ['p', 'ul', 'ol']
        // Verify all significant nodes are one of allowed element types
        for (const n of significant) {
            const tagMatch = n.match(/^\s*<\s*([a-zA-Z0-9\-]+)/s)
            if (!tagMatch) return full // found text or unexpected node -> keep original
            const tagName = tagMatch[1].toLowerCase()
            if (!allowed.includes(tagName)) return full
        }

        // Transform: for each top-level element node, wrap its inner content with the <ins...> and keep the element tags
        const transformed = nodes.map(n => {
            if (/^\s*$/s.test(n) || /^<!--[\s\S]*-->$/s.test(n)) return n // preserve whitespace/comments

            const opener = n.match(/^\s*<\s*([a-zA-Z0-9\-]+)([^>]*)>/s)
            if (!opener) return n
            const tag = opener[1]
            // find exact positions to preserve original spacing/content
            const openingEnd = n.indexOf('>')
            const closingTagLower = `</${tag.toLowerCase()}>`
            const closingStart = n.toLowerCase().lastIndexOf(closingTagLower)
            if (openingEnd === -1 || closingStart === -1) return n

            const openingTag = n.slice(0, openingEnd + 1)
            const innerContent = n.slice(openingEnd + 1, closingStart)
            const closingTag = n.slice(closingStart)
            return openingTag + `<ins${insAttrs}>` + innerContent + `</ins>` + closingTag
        }).join('')

        return transformed
    })
    return text
}

