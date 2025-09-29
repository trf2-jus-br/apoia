import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const url = new URL(req.url)
  const status = (url.searchParams.get('status') || 'all') as any
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1
  const { id } = await props.params
  try {
    const batchId = Number(id)
    const owns = await Dao.assertBatchOwnership(batchId)
    if (!owns) return Response.json({ errormsg: 'Forbidden' }, { status: 403 })
    const jobs = await Dao.listBatchJobs(batchId, status, page)
    // Backfill per-row costs for READY jobs missing cost_sum (common for older runs before cost wiring)
    const toBackfill = jobs.filter(j => j.status === 'READY' && (j as any).cost_sum == null)
    if (toBackfill.length) {
      await Promise.all(toBackfill.map(j => Dao.backfillJobCost(batchId, (j as any).id, (j as any).dossier_code)))
      const refreshed = await Dao.listBatchJobs(batchId, status, page)
      return Response.json({ status: 'OK', jobs: refreshed })
    }
    return Response.json({ status: 'OK', jobs })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const { id } = await props.params
  const body = await req.json()
  const { action, numbers } = body || {}
  try {
    const batchId = Number(id)
    const owns = await Dao.assertBatchOwnership(batchId)
    if (!owns) return Response.json({ errormsg: 'Forbidden' }, { status: 403 })
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
    return Response.json({ errormsg: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
