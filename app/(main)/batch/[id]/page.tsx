import Fetcher from '@/lib/utils/fetcher'
import BatchPanelClient from '@/app/(main)/batch/[id]/BatchPanelClient'
import { Dao } from '@/lib/db/mysql'

export const maxDuration = 60

async function getSummary(id: number) {
  const owns = await Dao.assertBatchOwnership(id)
  if (!owns) throw new Error('Forbidden')
  const summary = await Dao.getBatchSummary(id)
  if (!summary) throw new Error('Not found')
  return summary
}

export async function fetchDollar() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/report/dollar`)
    if (!res.ok) return null
    const json = await res.json()
    return json?.rate || null
  } catch {
    return null
  }
}

export default async function BatchPanel(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const summary = await getSummary(parseInt(id))
  const usdBrl = await fetchDollar()
  const promptName = summary?.prompt_base_id && (await Dao.retrieveLatestPromptByBaseId(summary.prompt_base_id))?.name
  return <BatchPanelClient id={id} initialSummary={summary} usdBrl={usdBrl} promptName={promptName} />
}
