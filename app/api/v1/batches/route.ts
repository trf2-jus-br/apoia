import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

/**
 * POST /api/v1/batches
 * Body: { name, tipo_de_sintese, complete, numbers: string[] }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, tipo_de_sintese, complete, numbers } = body || {}
  if (!name || !Array.isArray(numbers)) return Response.json({ errormsg: 'Invalid body' }, { status: 400 })
  try {
    const batch = await Dao.createBatchWithJobs({ name, tipo_de_sintese, complete: !!complete, numbers })
    return Response.json({ status: 'OK', batch })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}

/**
 * GET /api/v1/batches
 * Lista batches do usuário atual
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await Dao.listBatchesForUser()
    return Response.json({ status: 'OK', rows })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
