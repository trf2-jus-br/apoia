import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const batchId = Number(id)
  const owns = await Dao.assertBatchOwnership(batchId)
  if (!owns) return Response.json({ errormsg: 'Forbidden' }, { status: 403 })
  // If there are no pending jobs, keep it paused and return summary
  const current = await Dao.getBatchSummary(batchId)
  if (current && current.totals.pending === 0) {
    await Dao.setBatchPaused(batchId, true)
    const summary = await Dao.getBatchSummary(batchId)
    return Response.json({ status: 'OK', summary })
  }
  await Dao.setBatchPaused(batchId, false)
  const summary = await Dao.getBatchSummary(batchId)
  return Response.json({ status: 'OK', summary })
}
