import { tool } from "ai"
import { z } from "zod"
import { UserType } from "../user"

// =====================
// Tipos
// =====================

export interface LeadingCaseTheme {
    id: string
    nr: string
    tese: string
    tipo: string
    orgao: string
    questao: string
    situacao: string
    ultimaAtualizacao: string
    processosParadigma: { numero: string }[]
    [key: string]: any
}

// =====================
// Utilidades internas
// =====================

const fetchWithTimeout = async (url: string, options: RequestInit & { timeoutMs?: number }) => {
    const { timeoutMs = 15000, ...rest } = options
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...rest, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

export const searchByLeadingCase = async (numero: string): Promise<LeadingCaseTheme[]> => {
    const urlTemplate = process.env.LEADING_CASE_SEARCH_API_URL

    if (!urlTemplate) {
        throw new Error('LEADING_CASE_SEARCH_API_URL não está configurada')
    }

    if (!urlTemplate.includes('{numero}')) {
        throw new Error('LEADING_CASE_SEARCH_API_URL deve conter o placeholder {numero}')
    }

    const sanitized = numero.replace(/[^0-9]/g, '')
    if (!sanitized) {
        throw new Error('Número do processo inválido')
    }

    const url = urlTemplate.replace('{numero}', encodeURIComponent(sanitized))

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'ApoiaBot/1.0 (+https://github.com/trf2-jus-br)'
        }
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Leading Case Search API error (HTTP ${response.status}): ${errorText}`)
    }

    return await response.json() as LeadingCaseTheme[]
}

// =====================
// Tool Export
// =====================

export const getLeadingCaseSearchTool = (_pUser: Promise<UserType>) => tool({
    description: 'Busca temas de repercussão geral do STF e recursos especiais repetitivos do STJ pelo número do processo paradigma (leading case).',
    inputSchema: z.object({
        numero: z.string().min(1, 'O número do processo é obrigatório.').describe('Número do processo paradigma (leading case). Apenas dígitos serão considerados.'),
    }),
    execute: async ({ numero }) => {
        const results = await searchByLeadingCase(numero)

        return {
            status: 'OK' as const,
            count: results.length,
            results,
        }
    }
})
