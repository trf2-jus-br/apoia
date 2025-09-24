import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const batch_id = Number(id)
  try {
    const owns = await Dao.assertBatchOwnership(batch_id)
    if (!owns) return Response.json({ errormsg: 'Forbidden' }, { status: 403 })
    const summary = await Dao.getBatchSummary(batch_id)
    if (!summary) return Response.json({ errormsg: 'Not found' }, { status: 404 })
    return Response.json({ status: 'OK', summary })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
