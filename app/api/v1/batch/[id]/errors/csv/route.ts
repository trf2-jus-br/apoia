import { getCurrentUser, assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { UnauthorizedError, ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function GET_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await Dao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  const csv = await Dao.getErrorsCsv(batchId)
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="batch-${id}-errors.csv"` } })
}

export const GET = withErrorHandler(GET_HANDLER as any)
