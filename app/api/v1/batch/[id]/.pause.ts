import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

// POST /api/v1/batch/{id}/pause
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  try {
    await Dao.setBatchPaused(Number(id), true)
    const summary = await Dao.getBatchSummary(Number(id))
    return Response.json({ status: 'OK', summary })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
