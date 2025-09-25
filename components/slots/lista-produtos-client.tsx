'use client'

import { Suspense, useState } from 'react'
import { maiusculasEMinusculas } from '@/lib/utils/utils'
import { ResumoDePecaLoading } from '@/components/loading'
import { calcSha256 } from '@/lib/utils/hash'
import { ContentType, GeneratedContent } from '@/lib/ai/prompt-types'
import AiContent from '@/components/ai-content'
import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support'
import { P } from '@/lib/proc/combinacoes'
import Chat from './chat'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import AiTitle from '@/components/ai-title'
import { VisualizationEnum } from '@/lib/ui/preprocess'
import { preprocessTemplate } from '@/lib/ai/template'
import { isInformationExtractionPrompt } from '@/lib/ai/auto-json'
import { InformationExtractionForm } from '@/components/InformationExtractionForm'
import { Pedidos } from './pedidos'
import { PedidosFundamentacoesEDispositivos } from './pedidos-fundamentacoes-e-dispositivos'

const Frm = new FormHelper(true)

const onBusy = (Frm: FormHelper, requests: GeneratedContent[], idx: number) => {
    Frm.set('pending', Frm.get('pending') + 1)
}

const onReady = (Frm: FormHelper, requests: GeneratedContent[], idx: number, content: ContentType) => {
    const request = requests[idx]
    Frm.set('pending', Frm.get('pending') - 1)

    // Frm.set(`flow.ready[${idx}]`, content)
    if (requests[idx].produto === P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS && content.json) {
        Frm.set('pedidos', content.json)
    }
    if (content.json && isInformationExtractionPrompt(requests[idx].internalPrompt?.prompt)) {
        const informationExtractionVariableName = `_information_extraction_${idx}`
        Frm.set(informationExtractionVariableName, content.json)
    }
}

function requestSlot(Frm: FormHelper, requests: GeneratedContent[], idx: number, dossierCode: string, model: string) {
    const request = requests[idx]

    const informationExtractionVariableName = `_information_extraction_${idx}`
    const dataHash = calcSha256(request.data)
    const lastDataHash = Frm.get(`_lastDataHash_${idx}`)
    if (lastDataHash !== dataHash) {
        Frm.set(`_lastDataHash_${idx}`, dataHash)
        Frm.set(informationExtractionVariableName, undefined)
    }
    const information_extraction = Frm.get(informationExtractionVariableName)

    console.log('requestSlot: request', request.produto)

    const pedidos = Frm.get('pedidos')
    if (request.produto === P.PEDIDOS && pedidos) {
        return <Pedidos pedidos={pedidos} request={request} Frm={Frm} key={idx} />
    } else if (request.produto === P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS && pedidos) {
        return <PedidosFundamentacoesEDispositivos pedidos={pedidos} request={request} nextRequest={requests[idx + 1]} Frm={Frm} key={idx} dossierCode={dossierCode} />
    } else if (isInformationExtractionPrompt(request.internalPrompt?.prompt) && information_extraction) {
        // console.log('requestSlot: information_extraction', request.internalPrompt?.prompt, information_extraction)
        return <div key={idx}>
            <AiTitle request={request} />
            <InformationExtractionForm promptMarkdown={request.internalPrompt.prompt} promptFormat={request.internalPrompt.format} Frm={Frm} variableName={informationExtractionVariableName} />
        </div>
    } else if (request.produto === P.CHAT) {
        if (Frm.get('pending') > 0) return null
    return <Chat definition={request.internalPrompt} data={request.data} model={(request.internalPrompt as any)?.model || 'unknown'} key={dataHash} />
    }

    return <div key={idx}>
        <AiTitle request={request} />
        <Suspense fallback={ResumoDePecaLoading()}>
            <AiContent definition={request.internalPrompt} data={request.data} key={`prompt: ${request.promptSlug} data: ${dataHash}`} onBusy={() => onBusy(Frm, requests, idx)} onReady={(content) => onReady(Frm, requests, idx, content)}
                visualization={request.internalPrompt.template ? VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS : undefined} diffSource={request.internalPrompt.template ? preprocessTemplate(request.internalPrompt.template) : undefined} dossierCode={dossierCode} />
        </Suspense>
    </div>
}

export const ListaDeProdutos = ({ dadosDoProcesso, requests, model }: { dadosDoProcesso: DadosDoProcessoType, requests: GeneratedContent[], model: string }) => {
    const [data, setData] = useState({ pending: 0 } as any)

    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return ''

    // const tipoDeSintese = dadosDoProcesso.tipoDeSintese
    // const produtos = dadosDoProcesso.produtos
    // if (!tipoDeSintese || !produtos || produtos.length === 0) return ''

    Frm.update(data, setData, EMPTY_FORM_STATE)

    return <>{requests.map((request, idx) => {
        if (idx > 0 && requests[idx - 1].produto === P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS) return null      
        return requestSlot(Frm, requests, idx, dadosDoProcesso.numeroDoProcesso, model)
    })}

        {/* <p>{JSON.stringify(data)}</p> */}
    </>
}


