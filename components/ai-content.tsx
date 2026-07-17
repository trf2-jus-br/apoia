'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { trackAIStart, trackAIComplete, trackAIError } from '@/lib/utils/ga'
import EvaluationModal from './ai-evaluation'
import { evaluate } from '../lib/ai/generate'
import { preprocess, Visualization, VisualizationEnum } from '@/lib/ui/preprocess'
import { ResumoDePecaLoading } from '@/components/loading'
import { ContentType, PromptConfigType, PromptDataType, PromptDefinitionType, PromptOptionsType, UsageType } from '@/lib/ai/prompt-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faThumbsDown } from '@fortawesome/free-regular-svg-icons'
import { faRefresh, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useExecutionId, usePromptContext, useSelectedPromptId } from '@/app/(main)/prompts/context/PromptContext'
import { Form } from 'react-bootstrap'
import devLog from '@/lib/utils/log'
import { readUIMessageStream, UIMessage } from 'ai'
import { parseSSEToUIMessageChunkStream } from '@/lib/ai/message-stream'
import ErrorMessage from './error-message'
import MessageStatus from './message-status'
import MessageFooter from './message-footer'
import { html2md } from '@/lib/utils/html2md'
import { formatHtmlToEprocStandard } from '@/lib/utils/messaging-helper'
import { highlightCitationsLongestMatch } from '@/lib/n-grams'
import { addLinkToPieces } from '@/lib/ui/link-to-piece'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import { playClickSound } from '@/lib/sound'

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

const preprocessPromptMessages = (text: string, promptMessages): string => {
    let resultText = text

    if (promptMessages) {
        let a: string[] = []
        for (const m of promptMessages) {
            const header = m.role === 'system'
                ? '---\\# SYSTEM PROMPT'
                : m.role === 'user'
                    ? '---\\# PROMPT'
                    : `---\\# ROLE: ${m.role}`
            let text = ''
            if (typeof m.content === 'string') {
                text = m.content
            } else if (Array.isArray(m.content)) {
                for (const part of m.content) {
                    if (part.type === 'text') {
                        text += part.text
                    } else if (part.type === 'object') {
                        text += JSON.stringify(part.object, null, 2)
                    } else if (part.type === 'file') {
                        text += `file: ${part.filename} (${part.mediaType})`
                    }
                }
            }
            const formatted = `${header}\n\n${text}\n\n`
            a.push(formatted)
        }
        let promptAsHtml = a.join('')
        promptAsHtml = promptAsHtml.replace(/^\s+/gm, '')
        promptAsHtml = preprocess(promptAsHtml, { kind: '' }, { textos: [] }, true).text
        resultText = highlightCitationsLongestMatch(promptAsHtml, resultText)
    }

    return resultText
}




export default function AiContent(params: { definition: PromptDefinitionType, data: PromptDataType, options?: PromptOptionsType, config?: PromptConfigType, visualization?: VisualizationEnum, dossierCode: string, diffSource?: string, onBusy?: () => void, onReady?: (content: ContentType) => void, dadosDoProcesso?: DadosDoProcessoType }) {
    const [current, setCurrent] = useState('')
    const [complete, setComplete] = useState(false)
    const [errormsg, setErrormsg] = useState('')
    const [show, setShow] = useState(false)
    const [evaluated, setEvaluated] = useState(false)
    const [visualizationId, setVisualizationId] = useState<number>(params.visualization)
    const [showTemplateTable, setShowTemplateTable] = useState(false)
    const [currentMessage, setCurrentMessage] = useState<UIMessage>({ id: null, role: 'assistant', parts: [] })
    const [copySuccess, setCopySuccess] = useState(false)
    const initialized = useRef(false)
    const contentRef = useRef<HTMLDivElement>(null);
    const executionId = useExecutionId()
    const selectedPromptId = useSelectedPromptId()
    const aggregatorPromptId = selectedPromptId !== null && params.definition.dbId !== selectedPromptId
        ? selectedPromptId
        : null
    const { isBetaTester } = usePromptContext();

    const reportError = (err: any, payload: any) => {
        if (err && typeof err === 'object' && 'message' in err && (err as Error).message === 'NEXT_REDIRECT') throw err
        const message =
            typeof err === 'string'
                ? err
                : (err && typeof err === 'object' && 'message' in err && (err as Error).message) || 'Erro desconhecido'
        setErrormsg(message);
        trackAIError({
            kind: payload.kind,
            model: payload.modelSlug,
            prompt: payload.promptSlug,
            dossier_code: payload.dossierCode,
            error_message: message
        })
    }

    const reportReady = (text: string, payload: any, modelUsed?: string) => {
        let json: any = undefined
        try {
            json = JSON.parse(text)
        } catch (e) { }
        if (params.onReady)
            params.onReady({
                raw: text,
                formatted: preprocess(text, params.definition, params.data, complete, visualizationId, params.diffSource).text,
                json,
                model: modelUsed || payload.modelSlug,
            })

        trackAIComplete({
            kind: payload.kind,
            model: payload.modelSlug,
            prompt: payload.promptSlug,
            dossier_code: payload.dossierCode,
            bytes: text.length,
            json: text?.startsWith('{') ? '1' : '0'
        })
    }
    const handleClose = async (evaluation_id: number, descr: string | null) => {
        setShow(false)
        if (evaluation_id) setEvaluated(await evaluate(params.definition, params.data, evaluation_id, descr))
    }
    const handleShow = () => setShow(true)

    const handleCopy = () => {
        console.log('Copying content to clipboard...')
        const prep = preprocess(processedText, params.definition, params.data, complete)
        console.log('Preprocessed for copy:', prep)
        const html = formatHtmlToEprocStandard(prep.text)
        const markdown = html2md(prep.text)
        if (navigator.clipboard && navigator.clipboard.write) {
            // Use modern Clipboard API to copy as HTML
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([markdown], { type: 'text/plain' })
            });

            navigator.clipboard.write([clipboardItem]).then(() => {
                setCopySuccess(true);
                setTimeout(() => {
                    setCopySuccess(false);
                }, 1000);
            }).catch((err) => {
                console.error('Erro ao copiar HTML para a área de transferência: ', err);
            });
        } else {
            // Fallback to plain text copy
            navigator.clipboard.writeText(markdown).then(() => {
                setCopySuccess(true);
                setTimeout(() => {
                    setCopySuccess(false);
                }, 1000);
            }).catch((err) => {
                console.error('Erro ao copiar para a área de transferência: ', err);
            });
        }
    }

    const handleCopySelected = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        event.clipboardData.setData('text/html', formatHtmlToEprocStandard(container.innerHTML));
        event.clipboardData.setData('text/plain', container.innerText);
        event.preventDefault();
    };

    const fetchStream = async () => {
        const textDecoder = new TextDecoder('utf-8')
        const payload = {
            kind: params.definition.kind,
            dbId: params.definition.dbId,
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
            execution_id: executionId,
            aggregator_prompt_id: aggregatorPromptId,
        }

        if (params.onBusy) params.onBusy()

        // Disparar evento de início
        trackAIStart({
            kind: payload.kind,
            model: payload.modelSlug,
            prompt: payload.promptSlug,
            dossier_code: payload.dossierCode,
        })

        let response: Response
        try {
            response = await fetch('/api/v1/ai?uiMessageStream=true', {
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
                reportError(msg || `HTTP error: ${response.status}`, payload)
                return
            }
        } catch (err) {
            reportError(err, payload)
            return
        }
        if (response.headers.get('Content-Type') === 'text/event-stream') {
            try {
                const chunkStream = parseSSEToUIMessageChunkStream(response.body!);
                const uiMessageStream = readUIMessageStream({
                    stream: chunkStream, onError: (err) => { reportError(err, payload); }
                });
                let parts: UIMessage['parts'] = [];
                let text: string = ''
                let lastMessage: UIMessage | undefined = undefined
                // Iterate over the stream and process each chunk
                for await (const message of uiMessageStream) {
                    lastMessage = message
                    setCurrentMessage(message)
                    devLog('Received message parts:', message.parts);
                    parts = message.parts;
                    if (parts?.find(p => p.type === 'text')) {
                        const textPart = parts.find(p => p.type === 'text');
                        text = textPart?.text || '';
                        setCurrent(text);
                    }
                }
                if ((text || '').startsWith('ERRO:')) {
                    reportError(text.replace('ERRO:', '').trim(), payload)
                    return
                } else if (text || text.startsWith('{')) {
                    // try to parse as JSON and find a errorMessage field
                    try {
                        const json = JSON.parse(text)
                        if (json.errorMessage) {
                            reportError(json.errorMessage.replace('ERRO:', '').trim(), payload)
                            return
                        }
                    } catch (e) { }

                }
                reportReady(text, payload, (lastMessage?.metadata as any)?.model)
            } catch (error) {
                console.error('Error fetching stream:', error);
            } finally {
                if (isBetaTester) playClickSound()
                setComplete(true)
            }
        } else {
            const reader = response.body?.getReader()
            if (reader) {
                const chunks: Uint8Array[] = []
                // const decoder = new TextDecoder('utf-8')
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) {
                        setComplete(true)
                        const text = Buffer.concat(chunks).toString("utf-8")
                        reportReady(text, payload)
                        break
                    }
                    chunks.push(value)
                    try {
                        const text = Buffer.concat(chunks).toString("utf-8")
                        setCurrent(text)
                    }
                    catch (e) {
                        devLog(e.message)
                    }
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

    let preprocessed = preprocess(current, params.definition, params.data, complete, visualizationId, params.diffSource)

    // Memoizar o processamento custoso das mensagens do prompt
    const processedText = useMemo(() => {
        let resultText = preprocessed.text
        // For text edited visualization, highlight citations in the prompt messages
        if (complete && (!visualizationId || visualizationId === VisualizationEnum.TEXT_EDITED)) {
            const promptMessages = (currentMessage?.metadata as any)?.messages
            resultText = preprocessPromptMessages(resultText, promptMessages)
        }
        if (params.dadosDoProcesso)
            resultText = addLinkToPieces(resultText, params.data.textos || [], params.dadosDoProcesso)
        return resultText
    }, [complete, visualizationId, currentMessage?.metadata, preprocessed.text])

    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleGlobalClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Verifica se o clique foi em um span com a classe específica
            if (target.classList.contains('widgetlinkdocumento')) {
                const idPiece = target.getAttribute('data-idpiece');
                const processNumber = target.getAttribute('data-numprocesso');
                exibirPeca(processNumber, idPiece);
            }
        };

        container.addEventListener('click', handleGlobalClick);
        return () => container.removeEventListener('click', handleGlobalClick);
    }, [current, errormsg]);

    const exibirPeca = (processNumber: string, idPiece: string) => {
        const url = `/api/v1/process/${processNumber}/piece/${idPiece}/binary`;
        window.open(url, '_blank');
    };

    return <>
        <MessageStatus message={currentMessage} />
        {current || errormsg
            ? <div className="mb-3" >
                <div className={`alert alert-${color} ai-content mb-0`}>
                    {color === 'warning' && <h1 className="mt-0">Rascunho</h1>}
                    {(complete || errormsg) && (
                        <>
                            <button
                                className={`btn btn-sm btn-transparent float-end d-print-none }`}
                                onClick={() => { handleCopy() }}
                            >
                                <FontAwesomeIcon icon={copySuccess ? faCheck : faCopy} />
                            </button>
                            {evaluated
                                ? <button className="btn btn-sm btn-transparent float-end d-print-none" onClick={() => { setCurrent(''); run() }}><FontAwesomeIcon icon={faRefresh} /></button>
                                : <button className="btn btn-sm btn-transparent float-end d-print-none" onClick={() => { handleShow() }}><FontAwesomeIcon icon={faThumbsDown} /></button>}
                        </>
                    )}
                    {errormsg
                        ? <ErrorMessage message={errormsg} />
                        : <div ref={contentRef} onCopy={handleCopySelected} dangerouslySetInnerHTML={{ __html: spinner(processedText, complete) }} />}
                    <EvaluationModal show={show} onClose={handleClose} />
                </div>
                {complete && <MessageFooter message={currentMessage} />}
                {preprocessed.templateTable && showTemplateTable &&
                    <div className="h-print">
                        <h2 className="">Tabela de Expressões</h2>
                        <div
                            key="content-id"
                            className="ai-content mb-3"
                            dangerouslySetInnerHTML={{ __html: preprocessed.templateTable }}
                        />
                    </div>
                }
            </div>
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