import fetcher from "@/lib/utils/fetcher"
import { NextResponse } from "next/server"
import { Dao } from "@/lib/db/mysql"
import { withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/usage/{court}:
 *   get:
 *     description: Obtem o consumo diário de um tribunal específico, filtrando entre datas.
 *     tags:
 *       - stats
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: court
 *         required: true
 *         description: Identificador numérico do tribunal conforme o padrão do CNJ
 *       - in: query
 *         name: start_date
 *         required: false
 *         description: Data inicial do período a ser consultado, no formato YYYY-MM-DD (intervalo fechado)
 *       - in: query
 *         name: end_date
 *         required: false
 *         description: Data final do período a ser consultado, no formato YYYY-MM-DD (intervalo aberto)
 *     responses:
 *       200:
 *         description: Estatísticas de uso do tribunal no período solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: OK se as informações foram obtidas com sucesso
 *                 usage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         description: Data do consumo no formato YYYY-MM-DD
 *                       usage_count:
 *                         type: integer
 *                         description: Contagem de uso do serviço no dia
 *                       approximate_cost:
 *                         type: number
 *                         description: Custo aproximado do serviço no dia, em reais (R$)
 */
async function GET_HANDLER(
  req: Request,
  props: { params: Promise<{ court }> }
) {
  const params = await props.params
  const court_id = parseInt(params.court)
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  const records = await Dao.retrieveCourtMonthlyUsage(court_id, startDate, endDate)

  const acceptHeader = req.headers.get('accept')
  if (acceptHeader && acceptHeader === 'application/text') {
    const a: string[] = []
    a.push('date^usage_count^approximate_cost')
    records.forEach((record) => {
      a.push(`${record.date}^${record.usage_count}^${record.approximate_cost}`)
    })
    const csvContent = a.join('\n')
    return new NextResponse(csvContent)
  }

  return Response.json({ status: 'OK', usage: records }, { status: 200 })
}

export const GET = withErrorHandler(GET_HANDLER as any)