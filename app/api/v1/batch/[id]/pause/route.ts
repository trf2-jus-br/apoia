import { getCurrentUser, assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { UnauthorizedError, ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function POST_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await Dao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  await Dao.setBatchPaused(batchId, true)
  const summary = await Dao.getBatchSummary(batchId)
  return Response.json({ status: 'OK', summary })
}

export const POST = withErrorHandler(POST_HANDLER as any)
