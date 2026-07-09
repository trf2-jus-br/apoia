import { tool } from "ai"
import { z } from "zod"
import { UserType } from "../user"
import devLog from "../utils/log"

// =====================
// Tipos Pangea (parcial – somente campos usados)
// =====================
interface PangeaParadigmaProcesso {
  link?: string
  numero?: string
}

export interface PangeaResultadoItem {
  id: string
  tipo?: string
  orgao?: string
  nr?: number
  tese?: string
  questao?: string
  situacao?: string
  ultimaAtualizacao?: string
  processosParadigma?: PangeaParadigmaProcesso[]
  highlight?: {
    tese?: string
    tese_snippet?: string
  }
  missing?: string[]
  suspensoes?: { ativa: boolean; dataSuspensao: string; descricao: string }[]
}

interface PangeaAggTipoTotal { tipo?: string; orgao?: string; total: number }
interface PangeaAggLocal { id: number; total: number }

export interface PangeaSearchRawResponse {
  resultados?: PangeaResultadoItem[]
  total?: number
  posicao?: number
  posicao_final?: number
  posicao_inicial?: number
  aggsEspecies?: PangeaAggTipoTotal[]
  aggsOrgaos?: PangeaAggTipoTotal[]
  aggsLocais?: PangeaAggLocal[]
}

// =====================
// Normalized output type
// =====================
export interface NormalizedPangeaItem {
  id: string
  especie?: string
  orgao?: string
  numero?: string
  tese?: string
  teseSnippet?: string
  questao?: string
  situacao?: string
  ultimaAtualizacao?: string
  paradigmas?: {
    processos?: { numero?: string; link?: string }[]
  }
  highlightFlags: { hadMissingTerms: boolean }
}

export interface PangeaNormalizedResponse {
  status: 'OK' | 'ERROR'
  page: number
  total: number
  count: number
  aggs: {
    especies: PangeaAggTipoTotal[]
    orgaos: PangeaAggTipoTotal[]
    locais: PangeaAggLocal[]
  }
  results: NormalizedPangeaItem[]
  error?: string
  debugRaw?: PangeaSearchRawResponse
}

// =====================
// Utilidades internas
// =====================

export const PANGEA_DEFAULT_ORGAOS = ["STF", "STJ"]
export const PANGEA_EXTENDED_ORGAOS = ["STF", "STJ", "TST", "TRT4", "TRT1", "TRT2", "TRT3", "TRT5"]
export const PANGEA_DEFAULT_TIPOS = ["SUM", "SV", "RG", "IAC", "SIRDR", "RR", "CT"]

const stripHtmlBasic = (html?: string): string | undefined => {
  if (!html) return html
  return html
    .replace(/<br\s*\/>/gi, '\n')
    .replace(/<br>/gi, '\n')
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+$/m, '')
    .replace(/\s{2,}/g, ' ') // collapse spaces
    .trim()
}

const normalizeItem = (item: PangeaResultadoItem, options: { stripHtml: boolean }): NormalizedPangeaItem => {
  const rawTese = item.highlight?.tese || item.tese
  const rawSnippet = item.highlight?.tese_snippet || item.highlight?.tese || item.tese

  const tese = options.stripHtml ? stripHtmlBasic(rawTese) : rawTese
  const teseSnippet = options.stripHtml ? stripHtmlBasic(rawSnippet) : rawSnippet
  const questao = options.stripHtml ? stripHtmlBasic(item.questao) : item.questao

  return {
    id: item.id,
    especie: item.tipo,
    orgao: item.orgao,
    numero: item.nr ? String(item.nr) : undefined,
    tese,
    teseSnippet,
    questao,
    situacao: item.situacao,
    ultimaAtualizacao: item.ultimaAtualizacao,
    paradigmas: item.processosParadigma ? {
      processos: item.processosParadigma.map(p => ({ numero: p.numero, link: p.link }))
    } : undefined,
    highlightFlags: { hadMissingTerms: !!(item.missing && item.missing.length) }
  }
}

const buildPayload = (query: string, page: number, orgaos: string[], tipos: string[]): any => ({
  filtro: {
    buscaGeral: query,
    todasPalavras: "",
    quaisquerPalavras: "",
    semPalavras: "",
    trechoExato: "",
    atualizacaoDesde: "",
    atualizacaoAte: "",
    cancelados: false,
    ordenacao: "Text",
    nr: "",
    pagina: page,
    tamanhoPagina: 10,
    orgaos,
    tipos
  }
})

const fetchWithTimeout = async (url: string, options: RequestInit & { timeoutMs?: number }) => {
  const { timeoutMs = 12000, ...rest } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export const searchPangea = async (params: {
  query: string
  page: number
  orgaos: string[]
  tipos: string[]
}): Promise<PangeaSearchRawResponse> => {
  const response = await fetchWithTimeout('https://pangeabnp.pdpj.jus.br/api/v1/precedentes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ApoiaBot/1.0 (+https://github.com/trf2-jus-br)'
    },
    body: JSON.stringify(buildPayload(params.query, params.page, params.orgaos, params.tipos))
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const json = await response.json() as PangeaSearchRawResponse
  devLog('Pangea response:', params.query, JSON.stringify(json.resultados?.length))
  return json
}

// =====================
// Tool Export
// =====================

export const getPangeaTool = (_pUser: Promise<UserType>) => tool({
  description: 'Busca teses, súmulas, OJs, temas de repercussão geral e repetitivos no Pangea (STF/STJ por padrão).',
  inputSchema: z.object({
    query: z.string().min(3, 'A consulta deve ter ao menos 3 caracteres.').describe('Termo de busca (mínimo 3 caracteres).'),
    page: z.number().int().min(1).default(1).describe('Página (1 a 10).'),
    orgaos: z.array(z.string()).optional().describe('Órgãos a filtrar (ex.: STF, STJ, TST, TRT4). Default: STF, STJ.'),
    tipos: z.array(z.string()).optional().describe('Tipos a filtrar (ex.: SUM, SV, RG, IAC, SIRDR, RR, CT).'),
    includeOthers: z.boolean().optional().describe('Se true, inclui um conjunto estendido de órgãos além dos passados.'),
    stripHtml: z.boolean().optional().default(true).describe('Remove tags HTML da tese e campos relacionados.'),
    maxItems: z.number().int().min(1).max(100).optional().describe('Limite máximo de itens retornados após filtro.'),
    debug: z.boolean().optional().describe('Se true, inclui resposta bruta e aggs.')
  }),
  execute: async ({ query, page, orgaos, tipos, includeOthers, stripHtml = true, maxItems, debug }) => {
    if (page > 10) {
      return { status: 'ERROR', error: 'Página acima do limite máximo (10).', page }
    }
    const finalOrgaos = (orgaos && orgaos.length ? orgaos : PANGEA_DEFAULT_ORGAOS)
    const mergedOrgaos = includeOthers ? Array.from(new Set([...finalOrgaos, ...PANGEA_EXTENDED_ORGAOS])) : finalOrgaos
    const finalTipos = (tipos && tipos.length ? tipos : PANGEA_DEFAULT_TIPOS)
    try {
      const raw = await searchPangea({ query: query.trim(), page, orgaos: mergedOrgaos, tipos: finalTipos })
      const resultados = raw.resultados || []
      const normalized = resultados.map(r => normalizeItem(r, { stripHtml }))
      const sliced = maxItems ? normalized.slice(0, maxItems) : normalized
      const response: PangeaNormalizedResponse = {
        status: 'OK',
        page,
        total: raw.total || resultados.length,
        count: sliced.length,
        aggs: {
          especies: raw.aggsEspecies || [],
          orgaos: raw.aggsOrgaos || [],
            locais: raw.aggsLocais || []
        },
        results: sliced,
        ...(debug ? { debugRaw: raw } : {})
      }
      return response
    } catch (error) {
      return {
        status: 'ERROR',
        page,
        total: 0,
        count: 0,
        aggs: { especies: [], orgaos: [], locais: [] },
        results: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      } satisfies PangeaNormalizedResponse
    }
  }
})

// Nota: fase 1 não implementa download de decisões / parsing RTF/PDF.
