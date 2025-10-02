import { getCurrentUser, assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { UnauthorizedError, ForbiddenError, BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function GET_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const url = new URL(req.url)
  const status = (url.searchParams.get('status') || 'all') as any
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await Dao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  const jobs = await Dao.listBatchJobs(batchId, status, page)
  const toBackfill = jobs.filter(j => j.status === 'READY' && (j as any).cost_sum == null)
  if (toBackfill.length) {
    await Promise.all(toBackfill.map(j => Dao.backfillJobCost(batchId, (j as any).id, (j as any).dossier_code)))
    const refreshed = await Dao.listBatchJobs(batchId, status, page)
    return Response.json({ status: 'OK', jobs: refreshed })
  }
  return Response.json({ status: 'OK', jobs })
}

async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const body = await req.json()
  const { action, numbers } = body || {}
  const batchId = Number(id)
  const owns = await Dao.assertBatchOwnership(batchId)
  if (!owns) throw new ForbiddenError()
  if (action === 'add') {
    const count = await Dao.addJobs(batchId, Array.isArray(numbers) ? numbers : [])
    return Response.json({ status: 'OK', added: count })
  } else if (action === 'delete') {
    const count = await Dao.deleteJobs(batchId, Array.isArray(numbers) ? numbers : [])
    return Response.json({ status: 'OK', deleted: count })
  } else if (action === 'retry' && body.jobId) {
    await Dao.retryJob(batchId, Number(body.jobId))
    return Response.json({ status: 'OK' })
  } else if (action === 'stop' && body.jobId) {
    await Dao.stopJob(batchId, Number(body.jobId))
    return Response.json({ status: 'OK' })
  }
  throw new BadRequestError('Invalid action')
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const POST = withErrorHandler(POST_HANDLER as any)
