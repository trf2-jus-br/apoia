// PTAX USD/BRL rate endpoint with 24h ISR cache (moved to /api/v1/report/dollar)
import { NextRequest } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/utils/api-error'

export const revalidate = 86400; // 24 hours

interface PtaxItem { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string }

async function fetchPtaxForDate(d: Date): Promise<PtaxItem | null> {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  const formatted = `${mm}-${dd}-${yyyy}`
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formatted}'&$top=1&$format=json`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const json = await res.json()
  const item: PtaxItem | undefined = json?.value?.[0]
  return item || null
}

async function getLatestPtax(maxLookbackDays = 7) {
  const now = new Date()
  for (let i = 0; i < maxLookbackDays; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const item = await fetchPtaxForDate(d)
    if (item) {
      return {
        rate: item.cotacaoVenda,
        source: 'PTAX',
        asOf: item.dataHoraCotacao
      }
    }
  }
  throw new Error('Nenhuma cotação PTAX encontrada no período')
}

async function GET_HANDLER(_req: NextRequest) {
  const data = await getLatestPtax()
  return Response.json(data)
}

export const GET = withErrorHandler(GET_HANDLER as any)
