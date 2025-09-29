import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { analyze } from '@/lib/ai/analysis'

export const maxDuration = 60

// POST /api/v1/batch/{id}/step
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
  const { id } = await props.params
  const batch_id = Number(id)

  // Check paused
  const summary = await Dao.getBatchSummary(batch_id)
  if (!summary) return Response.json({ errormsg: 'Not found' }, { status: 404 })
  if (summary.paused) return Response.json({ errormsg: 'Paused' }, { status: 400 })

  try {
  const processed = await Dao.stepBatch(batch_id, async (job: any) => {
      // Execute the job using existing analyze pipeline
      const tipo_de_sintese = summary.tipo_de_sintese || 'RELATORIO_DE_ACERVO'
      const complete = !!summary.complete
      try {
        const r = await analyze(summary.name, job.dossier_code, tipo_de_sintese, complete)
        // Sum costs for this job: use generations created under this analyze
        // We can compute cost_sum later via join; for now return undefined to leave as-is
        return { status: 'READY' as const }
      } catch (e: any) {
        return { status: 'ERROR' as const, error_msg: e?.message || String(e) }
      }
  })
  return Response.json({ status: 'OK', processedJobId: processed?.id || null })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
