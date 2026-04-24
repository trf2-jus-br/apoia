import { getCurrentUser } from '@/lib/user'
import { BatchDao } from '@/lib/db/dao'
import { analyze } from '@/lib/ai/analysis'

export const maxDuration = 60

async function POST_HANDLER(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const { id } = await props.params
  const batch_id = Number(id)

  // Check paused
  const summary = await BatchDao.getBatchSummary(batch_id)
  if (!summary) return Response.json({ errormsg: 'Not found' }, { status: 404 })
  if (summary.paused) return Response.json({ errormsg: 'Paused' }, { status: 400 })

  const processed = await BatchDao.stepBatch(batch_id, async (job: any) => {
      // Execute the job using existing analyze pipeline
      const kind: number = summary.prompt_latest_id
      if (!kind) return { status: 'ERROR' as const, error_msg: 'Batch sem prompt configurado' }
      const complete = !!summary.complete
      try {
        const r = await analyze(summary.name, job.dossier_code, kind as number, complete)
        // Sum costs for this job: use generations created under this analyze
        // We can compute cost_sum later via join; for now return undefined to leave as-is
        return { status: 'READY' as const }
      } catch (e: any) {
        return { status: 'ERROR' as const, error_msg: e?.message || String(e) }
      }
  })
  return Response.json({ status: 'OK', processedJobId: processed?.id || null })
}

export const POST = POST_HANDLER as any