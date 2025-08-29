import { buildRequests } from '@/lib/ai/analysis'
import { getPiecesWithContent, waitForTexts } from '@/lib/ai/prompt'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import { infoDeProduto } from '@/lib/proc/info-de-produto'
import { ListaDeProdutos } from '@/components/slots/lista-produtos-client'

export const ListaDeProdutosServer = async ({ pDadosDoProcesso, kind, pieces }) => {
    const dadosDoProcesso: DadosDoProcessoType = await pDadosDoProcesso

    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return ''

    const tipoDeSintese = dadosDoProcesso.tipoDeSintese
    const produtos = dadosDoProcesso.produtos
    if (!tipoDeSintese || !produtos || produtos.length === 0) return ''

    const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dadosDoProcesso.numeroDoProcesso)

    try {
        await waitForTexts({ textos: pecasComConteudo })
    } catch (error) {
        return ''
    }

    const requests = buildRequests(dadosDoProcesso.numeroDoProcesso, produtos.map(p => infoDeProduto(p), pecasComConteudo), pecasComConteudo)

    return <ListaDeProdutos dadosDoProcesso={dadosDoProcesso} requests={requests} />
}


