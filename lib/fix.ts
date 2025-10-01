
import { Plugin } from './proc/combinacoes'

export const assertStr = (str: string): string => {
    if (!str) return ''
    str = str.trim()
    return str
}

export const removeHyphen = (str) => {
    str = assertStr(str)
    const regex = /^(?:-|\*)?\s*(?<text>.+?)$/ms
    const m = str.match(regex)
    if (!m || !m.groups) return ''
    return assertStr(m.groups.text)
}

function findTriagemText(str: any) {
    const regex = /^# Triagem\n(?<text>[^\n$]+)$/ms
    const m = str.match(regex)
    return m
}

export const getTriagem = (str) => {
    const m = findTriagemText(str)
    const r = removeHyphen(m?.groups?.text)
    if (!r) throw new Error('Triagem não encontrada')
    return r
}

function findNormasText(str: any) {
    const regex = /^# Normas\/Jurisprudência Invocadas\s*\n(?<text>.+?)\n\n/ms
    const m = str.match(regex)
    return m
}

export const getNormas = (str) => {
    const m = findNormasText(str)
    const text = assertStr(m?.groups?.text)
    return text.split('\n').map(t => removeHyphen(t)).filter(t => !!t)
}

function findPalavrasChaveText(str: any) {
    const regex = /^# Palavras-Chave\s*\n(?<text>.+?)\n\n/ms
    const m = str.match(regex)
    return m
}

export const getPalavrasChave = (str) => {
    const m = findPalavrasChaveText(str)
    const text = assertStr(m?.groups?.text)
    return text.split('\n').map(t => removeHyphen(t)).filter(t => !!t)
}

function fixTriagem(str: string, map) {
    const m = findTriagemText(str)
    if (!m) return str
    const text = m[0]
    const original = getTriagem(str)
    const found = map[Plugin.TRIAGEM].find(r => r.descr === original)
    if (!found) return str
    const fixed = found.descr_main || found.descr
    const fixedText = text.replace(original, fixed)
    str = str.split(text).join(fixedText)
    return str
}

function fixPalavrasChave(str: string, map) {
    const m = findPalavrasChaveText(str)
    if (!m) return str
    const originalText = m[0]
    const original = getPalavrasChave(str)
    const fixed: string[] = []
    original.forEach(o => {
        const found = map[Plugin.PALAVRAS_CHAVE].find(r => r.descr === o)
        if (!found)
            fixed.push(o + ' (não encontrado)')
        else if (!found.hidden)
            fixed.push(found.descr_main || found.descr)
    })
    const title = originalText.split('\n')[0]
    const fixedText = title + '\n- ' + fixed.join('\n- ') + '\n\n'
    str = str.split(originalText).join(fixedText)
    return str
}

interface FixMap {
    [key: string]: [{
        descr: string,
        descr_main: string | null,
        hidden: boolean,
    }]
}

export const fixText = (str: string, map: FixMap) => {
    str = fixTriagem(str, map)
    str = fixPalavrasChave(str, map)
    return str
}