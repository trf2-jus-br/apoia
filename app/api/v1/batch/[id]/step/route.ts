import { assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { analyze } from '@/lib/ai/analysis'
import { ForbiddenError, NotFoundError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const { id } = await props.params
  const batch_id = Number(id)
  const owns = await Dao.assertBatchOwnership(batch_id)
  if (!owns) throw new ForbiddenError()
  const summary = await Dao.getBatchSummary(batch_id)
  if (!summary) throw new NotFoundError('Not found')
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
  const kind = (summary as any).prompt_base_id ? (summary as any).prompt_base_id : (summary.tipo_de_sintese || 'RELATORIO_DE_ACERVO')
  const complete = !!summary.complete
  await analyze(summary.name, job.dossier_code, kind, complete)
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

export const POST = withErrorHandler(POST_HANDLER as any)
