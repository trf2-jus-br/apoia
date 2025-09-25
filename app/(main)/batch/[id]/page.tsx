import Fetcher from '@/lib/utils/fetcher'
import BatchPanelClient from '@/app/(main)/batch/[id]/BatchPanelClient'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

async function getSummary(id: string) {
  const res = await Fetcher.get<any>(`/api/v1/batch/${id}`)
  return res?.summary
}

async function getJobs(id: string) {
  const res = await Fetcher.get<any>(`/api/v1/batch/${id}/jobs?status=all`)
  return res?.jobs || []
}

export async function fetchDollar() {
  const base = process.env.NEXTAUTH_URL_INTERNAL || ''
  if (!base) return null
  try {
    const res = await fetch(`${base}/api/v1/report/dollar`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json?.rate || null
  } catch {
    return null
  }
}

export default async function BatchPanel(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const summary = await getSummary(id)
  const jobs = await getJobs(id)
  const usdBrl = await fetchDollar()
  const promptName = summary?.prompt_base_id && (await Dao.retrieveLatestPromptByBaseId(summary.prompt_base_id))?.name
  console.log('BatchPanel', { id, promptName, summary, jobs, usdBrl })
  return <BatchPanelClient id={id} initialSummary={summary} initialJobs={jobs} usdBrl={usdBrl} promptName={promptName} />
}
