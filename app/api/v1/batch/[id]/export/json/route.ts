import { extractBatchData } from '../export-data'
import { withErrorHandler } from '@/lib/utils/api-error'
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

/**
 * @swagger
 * 
 * /api/v1/batch/{id}/export/json:
 *   get:
 *     description: Exporta dados estruturados de um lote em formato JSON. Funciona apenas para lotes cujo prompt principal produz saída estruturada (json_schema).
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
 *         description: Dados estruturados em JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   processNumber:
 *                     type: string
 */
async function GET_HANDLER(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const batchId = Number(params.id)
    const { rows } = await extractBatchData(batchId)
    return NextResponse.json(rows)
}

export const GET = withErrorHandler(GET_HANDLER)
