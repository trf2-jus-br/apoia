import { PieceStrategy, TipoDeSinteseValido } from "./combinacoes"
import { StatusDeLancamento } from "./process-types"
import { getAllAggregators } from "../ai/prompt-store"

/**
 * Build the list of valid synthesis types dynamically from the database.
 * Each aggregator .md file synced by the sync engine becomes a TipoDeSinteseValido.
 * Piece patterns are resolved via PieceStrategy using the aggregator's piece_strategy metadata.
 */
export async function getTiposDeSinteseValido(): Promise<TipoDeSinteseValido[]> {
    const aggregators = await getAllAggregators()
    const tipos: TipoDeSinteseValido[] = []

    for (const agg of aggregators) {
        const key = agg.slug
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

