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
