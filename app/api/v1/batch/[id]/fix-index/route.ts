import { getCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { Plugin } from '@/lib/proc/combinacoes'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { generateContent } from '@/lib/ai/generate'

export const maxDuration = 60

// POST /api/v1/batch/{id}/fix-index
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
  const params = await props.params
  const id: number = Number(params.id)
  try {
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

    console.log('enumDescrs', current)

    const data: PromptDataType = {
      textos: [{
        descr: 'Índice atual',
        label: 'indice-atual',
        slug: 'indice-atual',
        texto: JSON.stringify(current, null, 2),
        sigilo: '0'
      }]
    }

    console.log('data', data)

    const resp = await generateContent(getInternalPrompt('int-fix-index'), data)

    const suggestion = JSON.parse(resp.generation)

    const suggestedGroups = suggestion.Agrupamentos as { Tx_Titulo: string, Tx_Agrupados: string }[]
    const groups = suggestedGroups.map(g => ({ title: g.Tx_Titulo, codes: g.Tx_Agrupados.split(',').map(s => parseInt(s.trim())).filter(Boolean) }))

    console.log('groups', groups)

    // test if all codes were mapped
    const allCodes = current.map(c => c.id)
    console.log('allCodes', allCodes)
    const mappedCodes = groups.reduce((acc, g) => {
      g.codes.forEach((c: number) => {
        if (!acc.includes(c)) acc.push(c)
      })
      return acc
    }, [] as number[])
    console.log('mappedCodes', mappedCodes)
    const missingCodes = allCodes.filter(c => !mappedCodes.includes(c))
    console.log('missingCodes', missingCodes)
    if (missingCodes.length > 0) {
      throw new Error(`Códigos não mapeados: ${missingCodes.join(', ')}`)
    }

    for (const group of groups) {
      for (const code of group.codes) {
        await Dao.updateIAEnumItemDescrMain(code, group.title)
      }
    }

    return Response.json({ status: 'OK', summary: {} })
  } catch (e: any) {
    return Response.json({ errormsg: e?.message || String(e) }, { status: 500 })
  }
}
