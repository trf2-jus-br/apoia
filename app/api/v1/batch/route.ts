import { assertApiUser, getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { BadRequestError, UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'
import { assert } from 'console'

export const maxDuration = 60

/**
 * POST /api/v1/batch
 * Body: { name, tipo_de_sintese?, prompt_base_id?, complete, numbers: string[] }
 */
async function POST_HANDLER(req: Request) {
  const user = await assertApiUser()
  const body = await req.json()
  const { name, tipo_de_sintese, prompt_base_id, complete, numbers } = body || {}
  if (!name || !Array.isArray(numbers)) throw new BadRequestError('Invalid body')
  if ((tipo_de_sintese && prompt_base_id) || (!tipo_de_sintese && !prompt_base_id)) throw new BadRequestError('Informe exatamente um entre tipo_de_sintese ou prompt_base_id')
  const batch = await Dao.createBatchWithJobs({ name, tipo_de_sintese, prompt_base_id, complete: !!complete, numbers })
  return Response.json({ status: 'OK', batch })
}

/**
 * GET /api/v1/batch
 * Lista batches do usuário atual
 */
async function GET_HANDLER() {
  const user = await assertApiUser()
  const rows = await Dao.listBatchesForUser()
  return Response.json({ status: 'OK', rows })
}

export const POST = withErrorHandler(POST_HANDLER as any)
export const GET = withErrorHandler(GET_HANDLER as any)