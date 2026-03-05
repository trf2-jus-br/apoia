import Fetcher from '@/lib/utils/fetcher'
import BatchPanelClient from '@/app/(main)/batch/[id]/BatchPanelClient'
import { BatchDao, PromptDao } from '@/lib/db/dao'
import { getSelectedModelParams } from '@/lib/ai/model-server'
import { redirect } from 'next/navigation'
import { getAggregatorNameMap } from '@/lib/ai/prompt-store'

export const maxDuration = 60

async function getSummary(id: number) {
  const owns = await BatchDao.assertBatchOwnership(id)
  if (!owns) throw new Error('Forbidden')
  const summary = await BatchDao.getBatchSummary(id)
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
  const { apiKeyFromEnv } = await getSelectedModelParams()
  if (apiKeyFromEnv) redirect('/batch')
  const summary = await getSummary(parseInt(id))
  const usdBrl = await fetchDollar()
  const promptName = summary?.prompt_base_id && (await PromptDao.retrieveLatestPromptByBaseId(summary.prompt_base_id))?.name
  const nameMap = summary?.tipo_de_sintese ? await getAggregatorNameMap() : {}
  const tipoNome = summary?.tipo_de_sintese ? (nameMap[summary.tipo_de_sintese] || null) : null
  return <BatchPanelClient id={id} initialSummary={summary} usdBrl={usdBrl} promptName={promptName} tipoNome={tipoNome} />
}
