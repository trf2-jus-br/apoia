import { getCurrentUser, assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function GET_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batch_id = Number(id)
  const owns = await Dao.assertBatchOwnership(batch_id)
  if (!owns) throw new ForbiddenError()
  const summary = await Dao.getBatchSummary(batch_id)
  if (!summary) throw new NotFoundError('Batch não encontrado')
  return Response.json({ status: 'OK', summary })
}

/**
 * DELETE /api/v1/batch?id=123
 * Remove um batch (e seus registros associados) pertencente ao usuário atual
 */
async function DELETE_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batch_id = Number(id)
  if (!batch_id) throw new BadRequestError('Parâmetro id/batch_id inválido')
  const ok = await Dao.deleteBatch(batch_id)
  if (!ok) throw new NotFoundError('Batch não encontrado ou não autorizado')
  return Response.json({ status: 'OK' })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const DELETE = withErrorHandler(DELETE_HANDLER as any)

