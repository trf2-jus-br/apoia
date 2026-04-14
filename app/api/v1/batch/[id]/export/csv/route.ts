import { extractBatchData, buildCsv } from '../export-data'
import { slugify } from "@/lib/utils/utils"
import { withErrorHandler } from '@/lib/utils/api-error'
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

/**
 * @swagger
 * 
 * /api/v1/batch/{id}/export/csv:
 *   get:
 *     description: Exporta dados estruturados de um lote em formato CSV. Funciona apenas para lotes cujo prompt principal produz saída estruturada (json_schema).
 *     tags:
 *       - batch
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do lote
 *     responses:
 *       200:
 *         description: Dados estruturados em CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
async function GET_HANDLER(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const batchId = Number(params.id)
    const { rows, batchName } = await extractBatchData(batchId)
    const csv = buildCsv(rows)
    const filename = slugify(batchName) || `batch-${batchId}`
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
        }
    })
}

export const GET = withErrorHandler(GET_HANDLER)
