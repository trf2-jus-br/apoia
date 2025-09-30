import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
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

/**
 * DELETE /api/v1/batch?id=123
 * Remove um batch (e seus registros associados) pertencente ao usuário atual
 */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const { id } = await props.params
  const batch_id = Number(id)
  if (!batch_id) return Response.json({ errormsg: 'Parâmetro id/batch_id inválido' }, { status: 400 })
  try {
    const ok = await Dao.deleteBatch(batch_id)
    if (!ok) return Response.json({ errormsg: 'Batch não encontrado ou não autorizado' }, { status: 404 })
    return Response.json({ status: 'OK' })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

