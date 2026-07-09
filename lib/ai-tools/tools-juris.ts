import { tool } from "ai"
import { UserType } from "../user"
import { z } from "zod"

// Types for precedent search results
interface PrecedentResult {
    classe: string
    assunto: string
    competencia: string
    relator_originario: string
    data_autuacao: string
    data_julgamento: string
    uuid_inteiro_teor: string
    ementa: string
    numero_processo: string
}

interface PrecedentSearchResponse {
    status: string
    precedentes: PrecedentResult[]
}

export const getPrecedentTool = (pUser: Promise<UserType>) => tool({
    description: 'Busca precedentes jurisprudenciais usando uma consulta textual complexa com operadores lógicos.',
    inputSchema: z.object({
        searchQuery: z.string().describe('A consulta de busca com operadores lógicos como "e", "ou", "não", "?", "$", aspas duplas. Use sinônimos e operadores para fazer a busca da melhor maneira possível. Se não encontrar precedentes de boa qualidade, quantas vezes achar necessário, repita a pesquisa com outras palavras ou veja nas próximas páginas.'),
        page: z.number().min(1).default(1).describe('O número da página començando em 1 (cada página retorna até 20 resultados).'),
    }),
    execute: async ({ searchQuery, page }) => {
        try {
            const response = await searchPrecedents(searchQuery, page)
            return response
        } catch (error) {
            console.error('Error executing getPrecedentTool:', error)
            return {
                status: "ERROR",
                precedentes: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
})

const searchPrecedents = async (query: string, page: number): Promise<PrecedentSearchResponse> => {
    const baseUrl = 'https://juris.trf2.jus.br/consulta.php'
    const start = (page - 1) * 20

    // Prepare form data
    const formData = new URLSearchParams({
        start: start.toString(),
        rows: '20',
        q: query,
        tip_criterio_data: 'RELEV',
        dat_jul_ini: '',
        dat_jul_fim: '',
        numero_processo: ''
    })

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: formData
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const html = await response.text()
        const precedentes = parseHtmlResults(html)

        return {
            status: "OK",
            precedentes
        }
    } catch (error) {
        throw new Error(`Failed to search precedents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

const parseHtmlResults = (html: string): PrecedentResult[] => {
    const results: PrecedentResult[] = []

    // Extract case panels using regex - look for the complete panel structure
    const panelRegex = /<div class="panel panel-default">\s*<div class="panel-heading">(.*?)<div class="panel-body">(.*?)<\/div>\s*<\/div>/gs
    const panels = html.match(panelRegex) || []

    for (const panel of panels) {
        try {
            // Extract process number
            const processNumberMatch = panel.match(/onclick="JusTo\.jurisprudencia\.setcopiarConteudo\('([^']+)'\)"/);
            const numeroProcesso = processNumberMatch ? processNumberMatch[1] : ''

            // Extract UUID for full text
            const uuidMatch = panel.match(/href="documento\.php\?uuid=([^&]+)&/);
            const uuidInteiroTeor = uuidMatch ? uuidMatch[1] : ''

            // Extract ementa content from panel-body
            const panelBodyMatch = panel.match(/<div class="panel-body">\s*(.*?)\s*<\/div>/s);
            let ementa = ''
            if (panelBodyMatch) {
                // Clean HTML tags and normalize whitespace
                ementa = panelBodyMatch[1]
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .trim()
            }

            // Try to extract additional metadata from the panel structure
            // Note: The provided HTML doesn't show detailed metadata in individual panels
            // This would typically come from a more detailed view or be embedded in the HTML

            const result: PrecedentResult = {
                classe: '', // Would need additional API call or detailed HTML structure
                assunto: '', // Would need additional API call or detailed HTML structure  
                competencia: '', // Would need additional API call or detailed HTML structure
                relator_originario: '', // Would need additional API call or detailed HTML structure
                data_autuacao: '', // Would need additional API call or detailed HTML structure
                data_julgamento: '', // Would need additional API call or detailed HTML structure
                uuid_inteiro_teor: uuidInteiroTeor,
                ementa: ementa,
                numero_processo: numeroProcesso
            }

            // Only add results that have essential information
            if (numeroProcesso && (ementa || uuidInteiroTeor)) {
                results.push(result)
            }
        } catch (error) {
            console.error('Error parsing individual result:', error)
            // Continue processing other results
        }
    }

    return results
}

