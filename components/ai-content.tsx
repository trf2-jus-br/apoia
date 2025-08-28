'use client'

import { useEffect, useRef, useState } from 'react'
import EvaluationModal from './ai-evaluation'
import { evaluate } from '../lib/ai/generate'
import { preprocess, Visualization, VisualizationEnum } from '@/lib/ui/preprocess'
import { ResumoDePecaLoading } from '@/components/loading'
import { InfoDeProduto, P } from '@/lib/proc/combinacoes'
import { ContentType, PromptConfigType, PromptDataType, PromptDefinitionType, PromptOptionsType, TextoType } from '@/lib/ai/prompt-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbsDown } from '@fortawesome/free-regular-svg-icons'
import { faRefresh } from '@fortawesome/free-solid-svg-icons'
import { Form } from 'react-bootstrap'

export const getColor = (text, errormsg) => {
    let color = 'info'
    if (text && text.includes('<scratchpad>'))
        color = 'warning'
    if (text && text.includes('<result>'))
        color = 'success'
    if (errormsg)
        color = 'danger'
    return color
}

export const spinner = (s: string, complete: boolean): string => {
    if (complete) return s
    // if s ends with a tag, add a flashing cursor before it
    if (s && s.match(/<\/[a-z]+>$/)) {
        s = s.replace(/(?:\s*<\/[a-z]+>)+$/, '<span class="blinking-cursor">&#x25FE;</span>$&')
    }
    return s
}

export default function AiContent(params: { definition: PromptDefinitionType, data: PromptDataType, options?: PromptOptionsType, config?: PromptConfigType, visualization?: VisualizationEnum, dossierCode: string, diffSource?: string, onBusy?: () => void, onReady?: (content: ContentType) => void }) {
    const [current, setCurrent] = useState('')
    const [complete, setComplete] = useState(false)
    const [errormsg, setErrormsg] = useState('')
    const [show, setShow] = useState(false)
    const [evaluated, setEvaluated] = useState(false)
    const [visualizationId, setVisualizationId] = useState<number>(params.visualization)
    const [showTemplateTable, setShowTemplateTable] = useState(false)
    const initialized = useRef(false)

    const handleClose = async (evaluation_id: number, descr: string | null) => {
        setShow(false)
        if (evaluation_id) setEvaluated(await evaluate(params.definition, params.data, evaluation_id, descr))
    }
    const handleShow = () => setShow(true)

    const fetchStream = async () => {
        const textDecoder = new TextDecoder('utf-8')
        const payload = {
            kind: params.definition.kind,
            data: params.data,
            date: new Date(),
            overrideSystemPrompt: params.options?.overrideSystemPrompt,
            overridePrompt: params.options?.overridePrompt,
            overrideJsonSchema: params.options?.overrideJsonSchema,
            overrideFormat: params.options?.overrideFormat,
            cacheControl: params.options?.cacheControl,
            modelSlug: params.config?.model_slug,
            promptSlug: params.config?.prompt_slug,
            extra: params.config?.extra,
            dossierCode: params.dossierCode,
        }

        if (params.onBusy) params.onBusy()

        let response: Response
        try {
            response = await fetch('/api/v1/ai', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            if (!response.ok) {
                let msg: string | undefined = undefined
                try {
                    const { errormsg } = await response.json()
                    msg = errormsg
                } catch (e) { }
                if (!msg) {
                    try {
                        msg = await response.text()
                    } catch (e) { }
                }
                setErrormsg(msg || `HTTP error: ${response.status}`)
                return
            }
        } catch (err) {
            setErrormsg(err.message)
            return
        }
        const reader = response.body?.getReader()

        if (reader) {
            const chunks: Uint8Array[] = []
            // const decoder = new TextDecoder('utf-8')
            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    setComplete(true)
                    const text = Buffer.concat(chunks).toString("utf-8")
                    let json: any = undefined
                    try {
                        json = JSON.parse(text)
                    } catch (e) { }
                    if (params.onReady)
                        params.onReady({
                            raw: text,
                            formated: preprocess(text, params.definition, params.data, complete, visualizationId, params.diffSource).text,
                            json
                        })
                    break
                }
                chunks.push(value)
                try {
                    const text = Buffer.concat(chunks).toString("utf-8")
                    setCurrent(text)
                }
                catch (e) {
                    console.log(e.message)
                }
            }
        }
    }

    const run = async () => {
        setCurrent('')
        setErrormsg('')
        setComplete(false)
        setEvaluated(false)
        try {
            fetchStream()
        } catch (e) {
            setErrormsg(e.message)
        }
    }

    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        run()
        // run has stable identity inside component; ignore exhaustive-deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const color = getColor(current, errormsg)

    const preprocessed = preprocess(current, params.definition, params.data, complete, visualizationId, params.diffSource)

    return <>
        {current || errormsg
            ? <>
                <div className={`alert alert-${color} ai-content`}>
                    {color === 'warning' && <h1 className="mt-0">Rascunho</h1>}
                    {complete || errormsg
                        ? evaluated
                            ? <button className="btn btn-sm bt float-end d-print-none" onClick={() => { setCurrent(''); run() }}><FontAwesomeIcon icon={faRefresh} /></button>
                            : <button className="btn btn-sm bt float-end d-print-none" onClick={() => { handleShow() }}><FontAwesomeIcon icon={faThumbsDown} /></button>
                        : null}
                    {errormsg
                        ? <span>{errormsg}</span>
                        : <div dangerouslySetInnerHTML={{ __html: spinner(preprocessed.text, complete) }} />}
                    <EvaluationModal show={show} onClose={handleClose} />
                </div>
                {preprocessed.templateTable && showTemplateTable &&
                    <div className="h-print">
                        <h2 className="">Tabela de Expressões</h2>
                        <div className="ai-content mb-3" dangerouslySetInnerHTML={{ __html: preprocessed.templateTable }} />
                    </div>
                }
            </>
            : <ResumoDePecaLoading />
        }

        {complete && params.visualization !== undefined &&
            <div className="row d-print-none h-print mb-3">
                <div className="col col-auto">
                    <Form.Select aria-label="Tipo de Visualização" value={visualizationId} onChange={e => setVisualizationId(parseInt(e.target.value))} className='w-100 mt-2x'>
                        {Visualization.map(e => (
                            <option key={e.id} value={e.id}>{e.descr}</option>))}
                    </Form.Select>
                </div>
                {preprocessed.templateTable && !showTemplateTable &&
                    <div className="col">
                        <button className="btn btn-light float-end d-print-none" onClick={() => setShowTemplateTable(true)}>Ver Tabela de Expressões</button>
                    </div>}
            </div>
        }
    </>
}