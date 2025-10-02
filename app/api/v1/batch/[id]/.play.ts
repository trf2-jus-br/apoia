import { assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

// POST /api/v1/batch/{id}/play
async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  try {
    await Dao.setBatchPaused(Number(id), false)
    const summary = await Dao.getBatchSummary(Number(id))
    return Response.json({ status: 'OK', summary })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

export const POST = POST_HANDLER as any