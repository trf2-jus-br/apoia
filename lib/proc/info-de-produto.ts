import { maiusculasEMinusculas, slugify } from "../utils/utils"
import { InfoDeProduto, P, PieceStrategy, Plugin, ProdutoCompleto, ProdutosValidos, TipoDeSinteseValido } from "./combinacoes"
import { StatusDeLancamento } from "./process-types"
import { getAllAggregators } from "../ai/prompt-store"

export const infoDeProduto = (produto: P | ProdutoCompleto): InfoDeProduto => {
    let ip: InfoDeProduto
    if (typeof produto === 'object') {
        const complex = produto as any as ProdutoCompleto
        const tipos = Array.isArray(complex.dados) ? complex.dados : [complex.dados]
        ip = { produto: produto.produto, dados: tipos, ...ProdutosValidos[produto.produto] }
    } else
        ip = { produto, dados: [], ...ProdutosValidos[produto] }

    // Caso o produto seja um resumo de peça, vamos tentar localizar o melhor prompt e trocar o título
    if (ip.produto === P.RESUMO_PECA) {
        ip.titulo = maiusculasEMinusculas(ip.dados[0])
        // The actual prompt definition will be resolved from the database
        // at the call site via getPromptDefinition(). Here we just set the slug.
        ip.prompt = `resumo-${slugify(ip.dados[0])}`
    }
    return ip
}

/**
 * Reverse lookup: given a prompt slug (e.g., 'sentenca', 'analise-tr'),
 * find the corresponding InfoDeProduto by matching against ProdutosValidos.
 * Used to convert workflow successor slugs to P enum values and metadata.
 * 
 * @returns InfoDeProduto with produto P enum, titulo, plugins, or null if no match
 */
export function slugToInfoDeProduto(slug: string): InfoDeProduto | null {
    const normalized = slug.replace(/-/g, '_')
    for (const [key, val] of Object.entries(ProdutosValidos)) {
        const p = key as P
        const valNormalized = val.prompt.replace(/-/g, '_')
        if (valNormalized === normalized || val.prompt === slug) {
            return { produto: p, dados: [], titulo: val.titulo, prompt: val.prompt, plugins: val.plugins as Plugin[] }
        }
    }
    return null
}

/**
 * Build the list of valid synthesis types dynamically from the database.
 * Each aggregator .md file synced by the sync engine becomes a TipoDeSinteseValido.
 * Piece patterns are resolved via PieceStrategy using the aggregator's piece_strategy metadata.
 */
export async function getTiposDeSinteseValido(): Promise<TipoDeSinteseValido[]> {
    const aggregators = await getAllAggregators()
    const tipos: TipoDeSinteseValido[] = []

    for (const agg of aggregators) {
        const key = agg.kind.startsWith('^') ? agg.kind.substring(1) : agg.kind
        const content = agg.content
        const strategyName = content?.piece_strategy
        const padroes = strategyName ? PieceStrategy[strategyName]?.pattern : undefined
        const status = content?.status === 'publico' ? StatusDeLancamento.PUBLICO : StatusDeLancamento.EM_DESENVOLVIMENTO

        tipos.push({
            id: key,
            nome: agg.name || key,
            sort: typeof content?.sort === 'number' ? content.sort : 999,
            padroes,
            status,
            relatorioDeAcervo: !!content?.relatorio_de_acervo,
        })
    }

    tipos.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999))
    return tipos
}

