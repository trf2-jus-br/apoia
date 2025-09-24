import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { analyze } from '@/lib/ai/analysis'

export const maxDuration = 60

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const batch_id = Number(id)
  const owns = await Dao.assertBatchOwnership(batch_id)
  if (!owns) return Response.json({ errormsg: 'Forbidden' }, { status: 403 })
  const summary = await Dao.getBatchSummary(batch_id)
  if (!summary) return Response.json({ errormsg: 'Not found' }, { status: 404 })
  let dossier_code: string | undefined
  let job_id: number | undefined
  try {
    const body = await req.json().catch(() => ({}))
    if (body && (body.job_id != null)) {
      const n = Number(body.job_id)
      if (Number.isFinite(n) && n > 0) job_id = n
    }
    if (body && typeof body.dossier_code === 'string') {
      const onlyDigits = body.dossier_code.replace(/\D/g, '')
      if (onlyDigits.length === 20) dossier_code = onlyDigits
    }
  } catch {
    // ignore body parse errors; behave like normal step
  }
  // If paused and no specific target, do nothing
  if (summary.paused && !job_id && !dossier_code) return Response.json({ status: 'OK', processedJobId: null })

  const processed = await Dao.stepBatch(batch_id, async (job) => {
    try {
      const tipo_de_sintese = summary.tipo_de_sintese || 'RELATORIO_DE_ACERVO'
      const complete = !!summary.complete
      await analyze(summary.name, job.dossier_code, tipo_de_sintese, complete)
      return { status: 'READY' as const }
    } catch (e: any) {
      return { status: 'ERROR' as const, error_msg: e?.message || String(e) }
    }
  }, { job_id, dossier_code })
  // If after processing there are no more pending jobs, auto-pause
  const after = await Dao.getBatchSummary(batch_id)
  if (after && after.totals.pending === 0) {
    await Dao.setBatchPaused(batch_id, true)
  }
  return Response.json({ status: 'OK', processedJobId: processed?.id || null })
}
