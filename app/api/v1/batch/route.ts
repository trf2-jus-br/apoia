import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

/**
 * POST /api/v1/batch
 * Body: { name, tipo_de_sintese?, prompt_base_id?, complete, numbers: string[] }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const body = await req.json()
  const { name, tipo_de_sintese, prompt_base_id, complete, numbers } = body || {}
  if (!name || !Array.isArray(numbers)) return Response.json({ errormsg: 'Invalid body' }, { status: 400 })
  if ((tipo_de_sintese && prompt_base_id) || (!tipo_de_sintese && !prompt_base_id)) return Response.json({ errormsg: 'Informe exatamente um entre tipo_de_sintese ou prompt_base_id' }, { status: 400 })
  try {
    const batch = await Dao.createBatchWithJobs({ name, tipo_de_sintese, prompt_base_id, complete: !!complete, numbers })
    return Response.json({ status: 'OK', batch })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

/**
 * GET /api/v1/batch
 * Lista batches do usuário atual
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  try {
    const rows = await Dao.listBatchesForUser()
    return Response.json({ status: 'OK', rows })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
