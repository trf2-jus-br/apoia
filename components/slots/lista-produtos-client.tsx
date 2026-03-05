'use client'

import { Fragment, ReactNode, Suspense, useState } from 'react'
import { slugify } from '@/lib/utils/utils'
import { ResumoDePecaLoading } from '@/components/loading'
import { calcMd5 } from '@/lib/utils/hash'
import { ContentType, GeneratedContent, PromptDataType, TextoType } from '@/lib/ai/prompt-types'
import AiContent from '@/components/ai-content'
import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support'
import Chat from './chat'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import AiTitle from '@/components/ai-title'
import { VisualizationEnum } from '@/lib/ui/preprocess'
import { preprocessTemplate } from '@/lib/ai/template'
import { isInformationExtractionPrompt } from '@/lib/ai/auto-json'
import { InformationExtractionForm } from '@/components/InformationExtractionForm'
import { Pedidos } from './pedidos'
import { PedidosFundamentacoesEDispositivos } from './pedidos-fundamentacoes-e-dispositivos'
import { Button, Col, Row } from 'react-bootstrap'
import { SinkFromURLType, SourcePayloadType } from '@/lib/utils/messaging'
import { sendApproveMessageToParent } from '@/lib/utils/messaging-helper'
import { usePromptContext } from '@/app/(main)/prompts/context/PromptContext'
import { PedidosViabilidadeRecurso } from './pedidos-viabilidade-recurso'

const Frm = new FormHelper(true)

const onBusy = (Frm: FormHelper, requests: GeneratedContent[], idx: number) => {
    Frm.set('pending', Frm.get('pending') + 1)
    Frm.set(`generated[${idx}]`, undefined)
}

const onReady = (Frm: FormHelper, requests: GeneratedContent[], idx: number, content: ContentType) => {
    Frm.set('pending', Frm.get('pending') - 1)
    Frm.set(`generated[${idx}]`, content)

    // Frm.set(`flow.ready[${idx}]`, content)
    if ((requests[idx].promptSlug === 'pedidos-fundamentacoes-e-dispositivos' || requests[idx].promptSlug === 'juizo-viabilidade-recurso') && content.json) {
        Frm.set('pedidos', content.json)
    }
    if (content.json && isInformationExtractionPrompt(requests[idx].internalPrompt?.prompt)) {
        const informationExtractionVariableName = `_information_extraction_${idx}`
        Frm.set(informationExtractionVariableName, content.json)
    }
}

function textosAnteriores(Frm: FormHelper, requests: GeneratedContent[], idx: number): TextoType[] {
    const textos: TextoType[] = []
    let i = 0
    for (const r of requests) {
        if (i >= idx) break
        if (r.promptSlug === 'chat') break
        const content = Frm.get(`generated[${i}]`)
        if (!content) break
        textos.push({ numeroDoProcesso: r?.data?.numeroDoProcesso || '', slug: slugify(r.title), descr: r.title, texto: content?.json ? content.formatted : content.raw, sigilo: '0' })
        i++
    }
    return textos
}

function dataComTextosAnteriores(Frm: FormHelper, requests: GeneratedContent[], idx: number): PromptDataType {
    const textos = textosAnteriores(Frm, requests, idx)
    const request = requests[idx]
    const data = JSON.parse(JSON.stringify(request.data))
    data.textos = [...(data.textos || []), ...textos]
    return data
}

function previousArePending(Frm: FormHelper, requests: GeneratedContent[], idx: number): boolean {
    for (let i = 0; i < idx; i++) {
        const content = Frm.get(`generated[${i}]`)
        if (!content?.raw) {
            // devLog('previousArePending', idx, requests[idx].title, i)
            return true
        }
    }
    // devLog('previousAreComplete', idx, requests[idx].title)
    return false
}

function requestSlot(Frm: FormHelper, requests: GeneratedContent[], idx: number, dossierCode: string, model: string, sidekick?: boolean, promptButtons?: ReactNode, sinkFromURL?: SinkFromURLType | null, sinkButtonText?: string | null, sourcePayload?: SourcePayloadType | null, dadosDoProcesso?: DadosDoProcessoType) {
    if (previousArePending(Frm, requests, idx)) return null
    const request = requests[idx]
    let requestComTextosAnteriores = request
    requestComTextosAnteriores = { ...requestComTextosAnteriores, data: dataComTextosAnteriores(Frm, requests, idx) }

    const informationExtractionVariableName = `_information_extraction_${idx}`
    const dataHash = calcMd5(request.data)
    const lastDataHash = Frm.get(`_lastDataHash_${idx}`)
    if (lastDataHash !== dataHash) {
        Frm.set(`_lastDataHash_${idx}`, dataHash)
        Frm.set(informationExtractionVariableName, undefined)
    }
    const information_extraction = Frm.get(informationExtractionVariableName)
    const pedidos = Frm.get('pedidos')
    if (request.promptSlug === 'pedidos-de-peticao-inicial' && pedidos) {
        return <Pedidos pedidos={pedidos} request={request} Frm={Frm} key={idx} />
    } else if (request.promptSlug === 'pedidos-fundamentacoes-e-dispositivos') {
        if (pedidos) {
            return <article key={idx}>
                <PedidosFundamentacoesEDispositivos pedidos={pedidos} request={requestComTextosAnteriores} nextRequest={requests[idx + 1]} Frm={Frm} dossierCode={dossierCode} onBusy={() => onBusy(Frm, requests, idx + 1)} onReady={(content) => onReady(Frm, requests, idx + 1, content)} dadosDoProcesso={dadosDoProcesso} />
                {!!sidekick && sinkFromURL === 'to-parent' && Frm.get(`generated[${idx + 1}]`) && <Row className="h-print mb-3">
                    <Col><Button variant="success" onClick={() => sendApproveMessageToParent(Frm.get(`generated[${idx + 1}]`), sourcePayload, slugify(requests[idx + 1]?.internalPrompt?.kind || ''), 'PROCESSO')} className="float-end">{sinkButtonText || 'Aprovar'}</Button></Col>
                </Row>}
            </article>
        }
    } else if (request.promptSlug === 'juizo-viabilidade-recurso') {
        console.log('requestSlot.PEDIDOS_VIABILIDADE_RECURSO', { request, pedidos })
        if (pedidos) {
            return <article key={idx}>
                <PedidosViabilidadeRecurso pedidos={pedidos} request={requestComTextosAnteriores} nextRequest={requests[idx + 1]} Frm={Frm} dossierCode={dossierCode} onBusy={() => onBusy(Frm, requests, idx + 1)} onReady={(content) => onReady(Frm, requests, idx + 1, content)} dadosDoProcesso={dadosDoProcesso} />
                {!!sidekick && sinkFromURL === 'to-parent' && Frm.get(`generated[${idx + 1}]`) && <Row className="h-print mb-3">
                    <Col><Button variant="success" onClick={() => sendApproveMessageToParent(Frm.get(`generated[${idx + 1}]`), sourcePayload, slugify(requests[idx + 1]?.internalPrompt?.kind || ''), 'PROCESSO')} className="float-end">{sinkButtonText || 'Aprovar'}</Button></Col>
                </Row>}
            </article>
        }
    } else if (isInformationExtractionPrompt(request.internalPrompt?.prompt) && information_extraction && !sidekick) {
        return <article key={idx}>
            <AiTitle request={request} />
            <InformationExtractionForm promptMarkdown={request.internalPrompt.prompt} promptFormat={request.internalPrompt.format} Frm={Frm} variableName={informationExtractionVariableName} />
        </article>
    } else if (request.promptSlug === 'chat' || request?.title.toLowerCase().startsWith('chat ')) {
        if (previousArePending(Frm, requests, idx)) return null
        return <Chat definition={request.internalPrompt} data={requestComTextosAnteriores.data} model={(request.internalPrompt as any)?.model || 'unknown'} key={dataHash} sidekick={sidekick} promptButtons={promptButtons} />
    }

    return <article key={idx}>
        <AiTitle request={request} />
        <Suspense fallback={ResumoDePecaLoading()}>
            <AiContent definition={request.internalPrompt} data={requestComTextosAnteriores.data} key={`prompt: ${request.promptSlug} data: ${dataHash}`} onBusy={() => onBusy(Frm, requests, idx)} onReady={(content) => onReady(Frm, requests, idx, content)}
                visualization={request.internalPrompt.template ? VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS : undefined} diffSource={request.internalPrompt.template ? preprocessTemplate(request.internalPrompt.template) : undefined} dossierCode={dossierCode}
                dadosDoProcesso={dadosDoProcesso} />
        </Suspense>
        {!!sidekick && sinkFromURL === 'to-parent' && Frm.get(`generated[${idx}]`) && <Row className="h-print mb-3">
            <Col><Button variant="success" onClick={() => sendApproveMessageToParent(Frm.get(`generated[${idx}]`), sourcePayload, slugify(requests[idx]?.internalPrompt?.kind || ''), 'PROCESSO')} className="float-end">{sinkButtonText || 'Aprovar'}</Button></Col>
        </Row>}

    </article>
}

export const ListaDeProdutos = ({ dadosDoProcesso, requests, model, sidekick, promptButtons, sinkFromURL, sinkButtonText }: { dadosDoProcesso: DadosDoProcessoType, requests: GeneratedContent[], model: string, sidekick?: boolean, promptButtons?: ReactNode, sinkFromURL?: SinkFromURLType, sinkButtonText?: string }) => {
    const { sourcePayload } = usePromptContext()
    const [data, setData] = useState({ pending: 0 } as any)

    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return ''

    // const tipoDeSintese = dadosDoProcesso.tipoDeSintese
    // const produtos = dadosDoProcesso.produtos
    // if (!tipoDeSintese || !produtos || produtos.length === 0) return ''

    Frm.update(data, setData, EMPTY_FORM_STATE)

    const ctrls = []
    for (let idx = 0; idx < requests.length; idx++) {
        if (idx > 0 && requests[idx - 1].promptSlug === 'pedidos-fundamentacoes-e-dispositivos') continue
        if (idx > 0 && requests[idx - 1].promptSlug === 'juizo-viabilidade-recurso') continue
        if (previousArePending(Frm, requests, idx)) break
        const ctrl = requestSlot(Frm, requests, idx, dadosDoProcesso.numeroDoProcesso, model, sidekick, promptButtons, sinkFromURL, sinkButtonText, sourcePayload, dadosDoProcesso)
        if (ctrl === null) break
        ctrls.push(ctrl)
    }

    return ctrls
}


