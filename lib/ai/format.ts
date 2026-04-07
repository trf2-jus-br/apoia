import { parse, ALL } from 'partial-json'
import nunjucks from 'nunjucks'
import { dateAddDays, dateAddMonths, parseDateDDMMYYYY } from '../utils/date'

export function buildFormatter(formatter: string): (s: string) => string {
    return (s: string) => format(formatter, s)
}

export function format(formatter: string, s: string): string {
    if (!s) return ''

    if (!s.startsWith('{')) return s

    const json = parse(s, ALL)
    if (!json) return ''

    if (!formatter) return s

    formatter = formatter.replace(/{=/g, '{{')
    formatter = formatter.replace(/=}/g, '}}')

    //    var env = nunjucks.configure()
    //    env.addFilter('deProcedencia', arr => arr.filter(e => e.tipo == 'PROCEDENTE'))
    //    env.addFilter('deImprocedencia', arr => arr.filter(e => e.tipo == 'IMPROCEDENTE'))

    const env = nunjucks.configure()
    env.addFilter('blockquoteLines', (str: string) => {
        if (!str) return str
        const escaped = String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        const result = escaped.replace(/\n/g, '\n> ')
        return (nunjucks as any).runtime.markSafe(result)
    })

    env.addFilter('sortByDate', (arr, field = 'Dt_Inicio', order = 'asc') => {
        if (!Array.isArray(arr)) return arr
        const dir = order === 'desc' ? -1 : 1
        return [...arr].sort((a, b) => {
            const da = toKey(a[field])
            const db = toKey(b[field])
            if (da > db) return 1 * dir
            if (da < db) return -1 * dir
            return 0
        })
        function toKey(v) {
            if (!v || !/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return ''
            const [dd, mm, yyyy] = v.split('/')
            return `${yyyy}-${mm}-${dd}` // compara lexicograficamente correto
        }
    })

    json.date = parseDateDDMMYYYY
    json.dateAddDays = dateAddDays
    json.dateAddMonths = dateAddMonths

    try {
        if (typeof json !== 'object' || json === null || Array.isArray(json)) {
            return `Erro: JSON inválido - esperado um objeto, recebido ${typeof json === 'object' ? 'array' : typeof json}`
        }
        // Validate formatter syntax
        try {
            env.renderString(formatter, {})
        } catch (e) {
            return `Erro no formato do template: ${e.message} - formato: <pre>${formatter}</pre>`
        }
        const result = env.renderString(formatter, json)
        return result
    } catch (e) {
        console.error('Error formatting string:', e)
        return `Erro ao formatar: ${e.message}, formato: ${formatter}, valor: ${JSON.stringify(json)}`
    }
}

