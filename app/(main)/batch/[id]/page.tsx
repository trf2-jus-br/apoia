import Fetcher from '@/lib/utils/fetcher'
import BatchPanelClient from '@/app/(main)/batch/[id]/BatchPanelClient'

export const maxDuration = 60

async function getSummary(id: string) {
  const res = await Fetcher.get(`/api/v1/batches/${id}`)
  return res?.summary
}

async function getJobs(id: string) {
  const res = await Fetcher.get(`/api/v1/batches/${id}/jobs?status=all`)
  return res?.jobs || []
}

async function fetchDollar() {
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
  return <BatchPanelClient id={id} initialSummary={summary} initialJobs={jobs} usdBrl={usdBrl} />
}
