import { PieceStrategy, TipoDeSinteseValido } from "./combinacoes"
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

        tipos.push({
            id: key,
            nome: agg.name || key,
            sort: typeof content?.sort === 'number' ? content.sort : 999,
            padroes,
            share: (agg as any).share || 'PADRAO',
            batchReport: !!content?.batch_report,
        })
    }

    tipos.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999))
    return tipos
}

