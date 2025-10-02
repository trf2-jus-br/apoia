import { getCurrentUser, assertApiUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { Plugin } from '@/lib/proc/combinacoes'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { generateContent } from '@/lib/ai/generate'
import { UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

// POST /api/v1/batch/{id}/fix-index
async function POST_HANDLER(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertApiUser()
  const params = await props.params
  const id: number = Number(params.id)
    const enum_id = await Dao.assertIAEnumId(Plugin.TRIAGEM)
    const items = await Dao.retrieveByBatchIdAndEnumId(id, enum_id)

    // use main item if available
    for (const item of items)
      item.enum_item_descr = item.enum_item_descr_main || item.enum_item_descr

    const current = items.reduce((acc, i) => {
      if (!acc.find(d => d.title === i.enum_item_descr)) {
        acc.push({ id: i.enum_item_id, title: i.enum_item_descr, count: 1 })
      } else {
        acc.find(d => d.title === i.enum_item_descr)!.count++
      }
      return acc
    }, [] as { id: number, title: string, count: number }[])

    const currentMap = current.reduce((acc, c) => {
      acc[c.id] = c.title
      return acc
    }, {} as Record<number, string>)

    const data: PromptDataType = {
      textos: [{
        numeroDoProcesso: '',
        descr: 'Índice atual',
        label: 'indice-atual',
        slug: 'indice-atual',
        texto: JSON.stringify(current, null, 2),
        sigilo: '0'
      }]
    }

    const resp = await generateContent(getInternalPrompt('int-fix-index'), data)

    const suggestion = JSON.parse(resp.generation)

    const suggestedGroups = suggestion.Agrupamentos as { Tx_Titulo: string, Tx_Agrupados: string }[]
    const groups = suggestedGroups.map(g => ({ title: g.Tx_Titulo, codes: g.Tx_Agrupados.split(',').map(s => parseInt(s.trim())).filter(Boolean) }))

    // test if all codes were mapped
    const allCodes = current.map(c => c.id)
    const mappedCodes = groups.reduce((acc, g) => {
      g.codes.forEach((c: number) => {
        if (!acc.includes(c)) acc.push(c)
      })
      return acc
    }, [] as number[])
    const missingCodes = allCodes.filter(c => !mappedCodes.includes(c))
    if (missingCodes.length > 0) {
      throw new Error(`Códigos não mapeados: ${missingCodes.join(', ')}`)
    }

    // Build mapping pairs from current title (descr_from) to suggested group.title (descr_to)
    const pairs: { descr_from: string, descr_to: string }[] = []
    for (const group of groups) {
      for (const code of group.codes) {
        const from = currentMap[code]
        const to = group.title
        if (from && to && from !== to) {
          pairs.push({ descr_from: from, descr_to: to })
        }
      }
    }

    // Deduplicate pairs
    const uniqKey = (p: { descr_from: string, descr_to: string }) => `${p.descr_from} -> ${p.descr_to}`
    const seen = new Set<string>()
    const deduped = pairs.filter(p => {
      const k = uniqKey(p)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    // Persist: rewrite mappings for this batch id
    const saved = await Dao.rewriteBatchFixIndexMap(id, deduped)

    return Response.json({ status: 'OK', saved, summary: { groups: groups.length, pairs: deduped.length } })
}

export const POST = withErrorHandler(POST_HANDLER as any)
