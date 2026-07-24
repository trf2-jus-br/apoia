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
import { PedidosViabilidadeRecursoEspecial, PedidosViabilidadeRecursoExtraordinario } from './pedidos-viabilidade-recurso'
import { PedidosAgravoInternoEmViabilidadeRecursoEspecial, PedidosAgravoInternoEmViabilidadeRecursoExtraordinario } from './pedidos-agravo-interno-em-viabilidade'

type PedidosComponentProps = {
    pedidos: { proximoPrompt: string; pedidos: any[] };
    request: GeneratedContent;
    nextRequest: GeneratedContent;
    Frm: FormHelper;
    dossierCode: string;
    onBusy?: () => void;
    onReady?: (content: ContentType) => void;
    dadosDoProcesso?: DadosDoProcessoType;
}

const PEDIDOS_COMPONENT_BY_SLUG: Record<string, React.ComponentType<PedidosComponentProps>> = {
    'pedidos-fundamentacoes-e-dispositivos': PedidosFundamentacoesEDispositivos,
    'juizo-viabilidade-recurso-especial': PedidosViabilidadeRecursoEspecial,
    'juizo-viabilidade-recurso-extraordinario': PedidosViabilidadeRecursoExtraordinario,
    'juizo-agravo-interno-em-viabilidade-recurso-especial': PedidosAgravoInternoEmViabilidadeRecursoEspecial,
    'juizo-agravo-interno-em-viabilidade-recurso-extraordinario': PedidosAgravoInternoEmViabilidadeRecursoExtraordinario,
}

// Slugs cujo slot consome dois requests (formulario + geracao seguinte): o JSON de
// saida (`content.json`) popula `Frm.pedidos` e o indice seguinte e renderizado pelo
// proprio componente, devendo ser pulado no loop principal.
const PEDIDOS_SLOTS = Object.keys(PEDIDOS_COMPONENT_BY_SLUG)

const Frm = new FormHelper(true)

const onBusy = (Frm: FormHelper, requests: GeneratedContent[], idx: number) => {
    Frm.set('pending', Frm.get('pending') + 1)
    Frm.set(`generated[${idx}]`, undefined)
}

const onReady = (Frm: FormHelper, requests: GeneratedContent[], idx: number, content: ContentType) => {
    Frm.set('pending', Frm.get('pending') - 1)
    Frm.set(`generated[${idx}]`, content)

    // Frm.set(`flow.ready[${idx}]`, content)
    if ((PEDIDOS_SLOTS.includes(requests[idx].promptSlug)) && content.json) {
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
        const optional = requests[i].optional === true
        const optionalActive = Frm.get(`_optional_${i}`) === true
        if (optional && !optionalActive)
            continue
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
    } else {
        const PedidosComponent = PEDIDOS_COMPONENT_BY_SLUG[request.promptSlug]
        if (PedidosComponent) {
            if (pedidos) {
                return <article key={idx}>
                    <PedidosComponent pedidos={pedidos} request={requestComTextosAnteriores} nextRequest={requests[idx + 1]} Frm={Frm} dossierCode={dossierCode} onBusy={() => onBusy(Frm, requests, idx + 1)} onReady={(content) => onReady(Frm, requests, idx + 1, content)} dadosDoProcesso={dadosDoProcesso} />
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
        } else if (request.promptSlug === 'chat' || request.promptSlug.startsWith('chat-') || request?.title.toLowerCase().startsWith('chat ')) {
            if (previousArePending(Frm, requests, idx)) return null
            return <Chat definition={request.internalPrompt} data={requestComTextosAnteriores.data} model={(request.internalPrompt as any)?.model || 'unknown'} key={dataHash} sidekick={sidekick} promptButtons={promptButtons} />
        }
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

    // Renderiza os requests em ordem. Ao iniciar uma faixa contígua de prompts
    // opcionais, faz um lookahead: exibe PRIMEIRO todos os botões dos opcionais
    // inativos (em ordem de índice) e SÓ DEPOIS os slots dos opcionais ativos.
    // Assim, com três opcionais onde só o do meio está ativo, a ordem visual fica
    // btn1, btn3 e slot2. Slots ativos continuam respeitando previousArePending:
    // um slot em processamento impede a execução dos demais slots posteriores, mas
    // os botões dos inativos permanecem visíveis.
    const ctrls = []
    for (let idx = 0; idx < requests.length; idx++) {
        if (idx > 0 && PEDIDOS_SLOTS.includes(requests[idx - 1].promptSlug)) continue

        const request = requests[idx]

        if (request.optional) {
            console.log('opcional: ', JSON.stringify(request))
            // Determina o fim da faixa contígua de opcionais a partir de idx.
            let end = idx
            while (end + 1 < requests.length && requests[end + 1].optional) end++

            // (1) Botões dos opcionais inativos da faixa, em ordem de índice. Agrupados
            // num container alinhado pela direita, criado somente quando há ao menos
            // um botão a exibir.
            const optionalButtons: ReactNode[] = []
            for (let i = idx; i <= end; i++) {
                if (Frm.get(`_optional_${i}`) !== true) {
                    optionalButtons.push(
                        <button key={`optional-${i}`} className="btn btn-secondary text-end" onClick={() => Frm.set(`_optional_${i}`, true)}>
                            {requests[i].title}
                        </button>
                    )
                }
            }
            if (optionalButtons.length > 0) {
                ctrls.push(<div key={`optional-group-${idx}`} className="text-end">{optionalButtons}</div>)
            }

            // (2) Slots dos opcionais ativos da faixa, em ordem de índice, com gate
            // de pendência. Um slot pendente interrompe o processamento dos slots
            // ativos restantes (seus botões, se inativos, já foram exibidos acima).
            for (let i = idx; i <= end; i++) {
                if (Frm.get(`_optional_${i}`) === true) {
                    if (previousArePending(Frm, requests, i)) break
                    const ctrl = requestSlot(Frm, requests, i, dadosDoProcesso.numeroDoProcesso, model, sidekick, promptButtons, sinkFromURL, sinkButtonText, sourcePayload, dadosDoProcesso)
                    if (ctrl === null) break
                    ctrls.push(ctrl)
                }
            }

            idx = end
            continue
        }

        // Prompt comum: gate de pendência e requestSlot normais.
        if (previousArePending(Frm, requests, idx)) break
        const ctrl = requestSlot(Frm, requests, idx, dadosDoProcesso.numeroDoProcesso, model, sidekick, promptButtons, sinkFromURL, sinkButtonText, sourcePayload, dadosDoProcesso)
        if (ctrl === null) break
        ctrls.push(ctrl)
    }

    return ctrls
}


