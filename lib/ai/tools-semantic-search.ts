import { tool } from "ai"
import { z } from "zod"
import { UserType } from "../user"
import devLog from "../utils/log"

// =====================
// Tipos da API
// =====================

interface SearchResultItemInner {
    id: string
    sourceId: string
    externalId: string
    content?: string
    data?: Record<string, any>
    createdAt?: string
    updatedAt?: string
}

interface SearchResultSource {
    id: string
    slug: string
    name: string
    endpoint?: string
    method?: string
    displayTemplate?: string
}

interface SearchResultItem {
    item: SearchResultItemInner
    renderedTitle?: string
    renderedDisplay?: string
    similarity?: number
    vectorScore?: number
    textScore?: number
    source: SearchResultSource
}

export interface SemanticSearchRawResponse {
    results?: SearchResultItem[]
    total?: number
    limit?: number
    offset?: number
}

// =====================
// Normalized output type
// =====================

export interface NormalizedSearchResult {
    title: string
    data: any
    id: string
    sourceSlug?: string
    externalId: string
    score?: number
    metadata?: Record<string, any>
}

export interface SemanticSearchNormalizedResponse {
    status: 'OK' | 'ERROR'
    total: number
    count: number
    offset: number
    limit: number
    results: NormalizedSearchResult[]
    error?: string
    debugRaw?: SemanticSearchRawResponse
}

// =====================
// Utilidades internas
// =====================

const normalizeSearchItem = (item: SearchResultItem): NormalizedSearchResult => {
    return {
        title: item.renderedTitle,
        data: item.item.data,
        id: item.item.id,
        sourceSlug: item.source.slug,
        externalId: item.item.externalId,
    }
}

const buildPayload = (
    query: string,
    sourceSlugs?: string[],
    limit: number = 10,
    offset: number = 0,
    searchType: 'vector' | 'hybrid' = 'hybrid',
    hybridAlpha: number = 0.5
): any => ({
    query,
    ...(sourceSlugs && sourceSlugs.length > 0 ? { sourceSlugs } : {}),
    limit,
    offset,
    searchType,
    hybridAlpha
})

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

export const searchSemantic = async (params: {
    query: string
    sourceSlugs?: string[]
    limit?: number
    offset?: number
    searchType?: 'vector' | 'hybrid'
    hybridAlpha?: number
}): Promise<SemanticSearchRawResponse> => {
    const apiUrl = process.env.SEMANTIC_SEARCH_API_URL

    if (!apiUrl) {
        throw new Error('SEMANTIC_SEARCH_API_URL não está configurada')
    }

    const url = `${apiUrl}/search`

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ApoiaBot/1.0 (+https://github.com/trf2-jus-br)'
        },
        body: JSON.stringify(buildPayload(
            params.query,
            params.sourceSlugs,
            params.limit || 10,
            params.offset || 0,
            params.searchType || 'hybrid',
            params.hybridAlpha !== undefined ? params.hybridAlpha : 0.5
        ))
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Semantic Search API error (HTTP ${response.status}): ${errorText}`)
    }

    const json = await response.json() as SemanticSearchRawResponse
    // console.log('Semantic Search response:', JSON.stringify(json))
    return json
}

// =====================
// Tool Export
// =====================

export const getSemanticSearchTool = (_pUser: Promise<UserType>) => tool({
    description: 'Busca semântica/híbrida de temas de repercussão geral do STF e recursos especiais repetitivos do STJ.',
    inputSchema: z.object({
        query: z.string().min(3, 'A consulta deve ter ao menos 3 caracteres.').describe('Texto da busca (mínimo 3 caracteres).'),
        sourceSlugs: z.array(z.string()).optional().describe('Slugs das fontes para filtrar (opcional).'),
        limit: z.number().int().min(1).max(200).default(10).describe('Número de resultados por página (1 a 200).'),
        offset: z.number().int().min(0).default(0).describe('Offset para paginação.'),
        searchType: z.enum(['vector', 'hybrid']).default('hybrid').describe('Tipo de busca: "vector" (só vetorial) ou "hybrid" (híbrida).'),
        hybridAlpha: z.number().min(0).max(1).default(0.5).describe('Peso da busca vetorial (0=só texto, 1=só vetorial).'),
        maxItems: z.number().int().min(1).max(200).optional().describe('Limite máximo de itens retornados após filtro.'),
        debug: z.boolean().optional().describe('Se true, inclui resposta bruta.')
    }),
    execute: async ({ query, sourceSlugs, limit, offset, searchType, hybridAlpha, maxItems, debug }) => {
        try {
            const apiUrl = process.env.SEMANTIC_SEARCH_API_URL
            if (!apiUrl) {
                return {
                    status: 'ERROR' as const,
                    total: 0, count: 0, offset: 0, limit: 0, results: [],
                    error: 'SEMANTIC_SEARCH_API_URL não está configurada'
                }
            }

            const raw = await searchSemantic({
                query: query.trim(),
                sourceSlugs,
                limit,
                offset,
                searchType,
                hybridAlpha
            })

            const results = raw.results || []

            devLog('Raw search results count:', results.length)

            const normalized = results.map(r => normalizeSearchItem(r))
            const sliced = maxItems ? normalized.slice(0, maxItems) : normalized

            const response: SemanticSearchNormalizedResponse = {
                status: 'OK',
                total: raw.total || sliced.length,
                count: sliced.length,
                offset: raw.offset || offset || 0,
                limit: raw.limit || limit || 10,
                results: sliced,
                ...(debug ? { debugRaw: raw } : {})
            }

            return response
        } catch (err: any) {
            return {
                status: 'ERROR' as const,
                total: 0, count: 0, offset: 0, limit: 0, results: [],
                error: err?.message || 'Erro desconhecido'
            }
        }
    }
})
