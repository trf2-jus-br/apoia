import { tool } from "ai"
import { UserType } from "../user"
import { z } from "zod"

// ============================================================================
// Utilitários de data (formato brasileiro DD/MM/YYYY)
// ============================================================================
// Exportados para permitir testes diretos, sem depender do runtime do AI SDK.

const BR_DATE_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/

/**
 * Faz parse de uma string no padrão DD/MM/YYYY para um Date (meia-noite local).
 * Lança Error com mensagem amigável se o formato for inválido ou a data não existir
 * (ex.: 31/02/2024, 00/13/2024).
 */
export const parseBrDate = (value: string): Date => {
    const match = value?.trim().match(BR_DATE_REGEX)
    if (!match) {
        throw new Error(`Data em formato inválido: "${value}". Use o padrão DD/MM/YYYY.`)
    }
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    const date = new Date(year, month - 1, day)
    // Detecção de datas inexistentes: o JS Date faz "overflow" (31/02 vira 03/03).
    // Se o mês/dia resultante for diferente, a data original não existe no calendário.
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new Error(`Data inexistente no calendário: "${value}".`)
    }
    return date
}

/**
 * Formata um Date no padrão DD/MM/YYYY (fuso local, sem ajuste de timezone).
 */
export const formatBrDate = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = String(date.getFullYear())
    return `${dd}/${mm}/${yyyy}`
}

/**
 * Soma anos, meses e dias a um Date. A soma é aplicada nesta ordem (anos, depois meses,
 * depois dias), preservando o dia do mês original; quando o dia não existe no mês de
 * destino (ex.: 31/01 + 1 mês), o resultado é clampado para o último dia do mês —
 * mesmo comportamento das bibliotecas usuais e do PHP DateTime::modify.
 */
export const addYMD = (date: Date, anos: number, meses: number, dias: number): Date => {
    const result = new Date(date)
    if (anos) result.setFullYear(result.getFullYear() + anos)

    if (meses) {
        const targetDay = result.getDate()
        result.setMonth(result.getMonth() + meses)
        // Se houve clamp (31 jan -> 3 mar), voltar para o último dia do mês anterior.
        if (result.getDate() !== targetDay) {
            result.setDate(0)
        }
    }

    if (dias) result.setDate(result.getDate() + dias)
    return result
}

/**
 * Calcula a diferença cronológica de calendário entre duas datas, decomposta em
 * anos, meses e dias cheios (sem usar diferença absoluta em milissegundos, para
 * respeitar variações de número de dias por mês e ano bissexto).
 *
 * Sempre não-negativo do ponto de vista de magnitude; quando `from > to`, troca a
 * ordem internamente e marca `negativo = true`. A tool formata com sinal negativo.
 */
export const calendarDiff = (
    from: Date,
    to: Date,
): { anos: number; meses: number; dias: number; negativo: boolean } => {
    let negativo = false
    let a = new Date(from)
    let b = new Date(to)
    if (a > b) {
        negativo = true;[a, b] = [b, a]
    }

    let anos = 0
    // Avança anos cheios enquanto a data resultante continuar sendo <= b.
    while (addYMD(a, anos + 1, 0, 0) <= b) anos++

    let meses = 0
    while (addYMD(a, anos, meses + 1, 0) <= b) meses++

    const base = addYMD(a, anos, meses, 0)
    const dias = Math.round((b.getTime() - base.getTime()) / 86_400_000)

    return { anos, meses, dias, negativo }
}

/**
 * Formata uma decomposição {anos, meses, dias} em texto no estilo
 * "1 ano, 2 meses e 3 dias", com pluralização correta e omissão de componentes zero.
 * Quando todos são zero, retorna "0 dia".
 */
export const formatDuration = (
    partes: { anos: number; meses: number; dias: number; negativo?: boolean },
): string => {
    const segmentos: string[] = []
    if (partes.anos) segmentos.push(`${partes.anos} ${partes.anos === 1 || partes.anos === -1 ? 'ano' : 'anos'}`)
    if (partes.meses) segmentos.push(`${partes.meses} ${partes.meses === 1 || partes.meses === -1 ? 'mês' : 'meses'}`)
    if (partes.dias) segmentos.push(`${partes.dias} ${partes.dias === 1 || partes.dias === -1 ? 'dia' : 'dias'}`)

    if (segmentos.length === 0) return '0 dia'

    const texto = segmentos.join(', ').replace(/, ([^,]*)$/, ' e $1')
    return partes.negativo ? `-${texto}` : texto
}

// ============================================================================
// Tools (AI SDK)
// ============================================================================

const dataSchema = z.string().regex(BR_DATE_REGEX, 'Use o formato DD/MM/YYYY.')

/**
 * Retorna a data atual no padrão DD/MM/YYYY (fuso local do servidor).
 * Útil quando o modelo precisa referenciar "hoje" em cálculos ou respostas.
 */
export const getCurrentDateTool = (pUser: Promise<UserType>) => tool({
    description:
        'Retorna a data de hoje no padrão DD/MM/YYYY. Use para saber a data atual quando precisar calcular prazos, idades ou diferenças.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            return formatBrDate(new Date())
        } catch (error) {
            console.error('Error executing getCurrentDateTool:', error)
            return `Erro ao obter a data atual: ${error instanceof Error ? error.message : 'erro desconhecido'}`
        }
    },
})

/**
 * Calcula a diferença cronológica entre duas datas (DD/MM/YYYY), decomposta em
 * anos, meses e dias cheios, retornando texto legível como "6 anos, 2 meses e 5 dias".
 */
export const getDateDiffTool = (pUser: Promise<UserType>) => tool({
    description:
        'Calcula a diferença entre duas datas no padrão DD/MM/YYYY, retornando o tempo decorrido em anos, meses e dias cheios (ex.: "1 ano, 2 meses e 3 dias"). Componentes iguais a zero são omitidos. Útil para calcular idade, tempo de processo, prazos em anos/meses.',
    inputSchema: z.object({
        startDate: dataSchema.describe('A data inicial no padrão DD/MM/YYYY.'),
        endDate: dataSchema.describe('A data final no padrão DD/MM/YYYY.'),
    }),
    execute: async ({ startDate, endDate }) => {
        try {
            const from = parseBrDate(startDate)
            const to = parseBrDate(endDate)
            const partes = calendarDiff(from, to)
            return formatDuration(partes)
        } catch (error) {
            console.error('Error executing getDateDiffTool:', error)
            return `Erro ao calcular a diferença: ${error instanceof Error ? error.message : 'erro desconhecido'}`
        }
    },
})

/**
 * Calcula uma data a partir de uma data inicial somando-se anos, meses e dias.
 * Todos os componentes aceitam valores positivos, negativos ou zero.
 */
export const getAddDateTool = (pUser: Promise<UserType>) => tool({
    description:
        'Calcula uma data final somando anos, meses e dias a uma data inicial no padrão DD/MM/YYYY. Cada componente (anos, meses, dias) pode ser positivo, negativo ou zero. Retorna a data resultante no padrão DD/MM/YYYY. Útil para calcular vencimentos, prazos processuais e datas retroativas.',
    inputSchema: z.object({
        startDate: dataSchema.describe('A data inicial no padrão DD/MM/YYYY.'),
        anos: z.number().int().default(0).describe('Quantidade de anos a somar (pode ser negativo). Padrão 0.'),
        meses: z.number().int().default(0).describe('Quantidade de meses a somar (pode ser negativo). Padrão 0.'),
        dias: z.number().int().default(0).describe('Quantidade de dias a somar (pode ser negativo). Padrão 0.'),
    }),
    execute: async ({ startDate, anos, meses, dias }) => {
        try {
            const base = parseBrDate(startDate)
            const result = addYMD(base, anos ?? 0, meses ?? 0, dias ?? 0)
            return formatBrDate(result)
        } catch (error) {
            console.error('Error executing addDateTool:', error)
            return `Erro ao calcular a data: ${error instanceof Error ? error.message : 'erro desconhecido'}`
        }
    },
})
