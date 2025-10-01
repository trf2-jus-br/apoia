'use client';

import { PromptDataType, PromptDefinitionType } from '@/lib/ai/prompt-types';
import { faEdit } from '@fortawesome/free-regular-svg-icons';
import { faChevronDown, faChevronUp, faFileLines, faPaperclip, faRobot, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react'
import showdown from 'showdown'
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatAnalytics } from '@/lib/analytics/chatAnalytics'
import TextareaAutosize from 'react-textarea-autosize'
import { Modal, Button, Form } from 'react-bootstrap';
import ErrorMessage from '../error-message';

const converter = new showdown.Converter({ tables: true })

import { getAllSuggestions, resolveSuggestion } from '@/components/suggestions/registry'
import type { SuggestionContext } from '@/components/suggestions/context'
import { Suggestion } from '../suggestions/base';
import { last } from 'lodash';
import { reasoning } from '@/lib/ai/reasoning';
import Reasoning from '../reasoning-control';

function preprocessar(mensagem: UIMessage, role: string) {
    const texto = mensagem.parts.reduce((acc, part) => {
        if (part.type === 'text') {
            acc += part.text
        }
        return acc
    }, '')
    if (!texto) return ''
    return converter.makeHtml(`<span class="d-none"><b>${role === 'user' ? 'Usuário' : 'Assistente'}</b>: </span>${texto}`)
}

function hasText(mensagem: UIMessage) {
    return mensagem.parts.some(part => part.type === 'text' && part.text && part.text.trim() !== '')
}

function toolMessage(part: any): ReactElement {
    const regexPiece = /^(.+):$\n<[a-z\-]+ event="([^"]+)"/gm
    if (!part) return null
    switch (part.type) {
        case 'tool-getProcessMetadata':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando dados de processo...</span>
                case 'input-available':
                    return (<span className="text-secondary">Obtendo dados do processo: {part.input?.processNumber}...</span>)
                case 'output-available':
                    return (<span className="text-secondary">Consultei dados do processo: {part.input?.processNumber}</span>)
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getPiecesText':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando peças...</span>
                case 'input-available':
                    if (part.input.pieceIdArray?.length === 1)
                        return <span className="text-secondary">Obtendo conteúdo da peça: {part.input.pieceIdArray[0]}...</span>
                    else if (part.input.pieceIdArray?.length > 1)
                        return <span className="text-secondary">Obtendo conteúdo das peças: {part.input.pieceIdArray.join(', ')}...</span>
                    else
                        return <span className="text-secondary">Obtendo conteúdo das peças...</span>
                case 'output-available':
                    const matches = []
                    let match
                    regexPiece.lastIndex = 0 // Reset regex state
                    while ((match = regexPiece.exec(part.output)) !== null) {
                        const kind = match[1].trim()
                        const eventNumber = match[2]
                        matches.push(`${kind} (${eventNumber})`)
                    }
                    if (matches.length === 1)
                        return <span className="text-secondary">Consultei conteúdo da peça: {matches[0]}</span>
                    else
                        return <span className="text-secondary">Consultei conteúdo das peças: {matches.join(', ')}</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getPrecedent':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando dados de precedentes...</span>
                case 'input-available':
                    return <span className="text-secondary">Obtendo dados de precedentes: {part.input?.searchQuery}...</span>
                case 'output-available':
                    return <span className="text-secondary">Consultei dados de precedentes: {part.input?.searchQuery}</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        default:
            return <span className="text-secondary">Ferramenta desconhecida: {part.type}</span>
    }
}

const getCookie = (name: string) => {
    if (typeof document === 'undefined') return undefined
    return document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=')[1]
}

type ModelMessage = { role: string; content: any; }

function convertToUIMessages(modelMsgs: ModelMessage[]): UIMessage[] {
    if (!Array.isArray(modelMsgs)) return []
    const ui: UIMessage[] = []

    modelMsgs.forEach((m, i) => {
        if (m.content) {
            ui.push({
                id: m.role === 'system' ? 'system' : `${m.role}-${i}`,
                role: m.role as any,
                parts: [{ type: 'text', text: m.content }]
            })
        }
    })

    return ui
}


let loadingMessages = false

export default function Chat(params: { definition: PromptDefinitionType, data: PromptDataType, model: string, footer?: ReactElement, withTools?: boolean, setProcessNumber?: (number: string) => void }) {
    const [processNumber, setProcessNumber] = useState(params?.data?.numeroDoProcesso || '');
    const [input, setInput] = useState('')
    const [files, setFiles] = useState<FileList | undefined>(undefined)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [clientError, setClientError] = useState<string | null>(null)

    const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null)
    const [activeModalKey, setActiveModalKey] = useState<string | null>(null)
    const [activeModalInitial, setActiveModalInitial] = useState<any>(null)
    const [activeModalSubmitHandler, setActiveModalSubmitHandler] = useState<((values: any, ctx: SuggestionContext) => void) | null>(null)
    const [modalDrafts, setModalDrafts] = useState<Record<string, any>>({})
    const [showReasoning, setShowReasoning] = useState(false)


    const handleProcessNumberChange = (number: string) => {
        setProcessNumber(number)
        if (params.setProcessNumber) params.setProcessNumber(number)
    }

    const { messages, setMessages, sendMessage, error, clearError } =
        useChat({
            transport: new DefaultChatTransport({ api: `/api/v1/chat${params.withTools ? '?withTools=true' : ''}` }),
            // messages: fetchedMessages,
        })

    // Hook de analytics encapsula instrumentação (depois de obter messages & error)
    const { createUserMessage } = useChatAnalytics({
        kind: params.definition.kind,
        model: params.model,
        dossierCode: processNumber || undefined,
        messages,
        error,
    })

    useEffect(() => {
        const load = async () => {
            const res = await fetch('/api/v1/ai?messagesOnly=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ kind: params.definition.kind, dossierCode: params?.data?.numeroDoProcesso, data: params.data, date: new Date().toISOString() }),
            })
            if (!res.ok)
                throw new Error(`Failed to fetch chat messages: ${res.status} ${res.statusText}`)
            const modelMsgs = await res.json()
            setMessages(convertToUIMessages(modelMsgs))
        }
        // Only load when definition.kind or data changes; setMessages is stable from hook
        load()
    }, [params.definition.kind, params.data, params?.data?.numeroDoProcesso, setMessages])

    const handleEditMessage = (idx: number) => {
        const message = messages[idx]
        if (message.role === 'user') {
            setInput((message.parts[0] as any).text)
            setMessages(messages.slice(0, idx))
        }
        setFocusToChatInput()
    }

    const setFocusToChatInput = useCallback(() => {
        setTimeout(() => {
            const inputElement = document.getElementById('chat-input') as (HTMLInputElement | HTMLTextAreaElement);
            if (inputElement) {
                inputElement.focus();
                const length = inputElement.value.length;
                inputElement.setSelectionRange(length, length);
            }
        }, 200);
    }, [])

    const handleSubmitAndSetFocus = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input.trim() === '') return;
        setClientError(null)
        // Build file parts (Data URLs already handled by useChat transport)
        const buildFileParts = async () => {
            if (!files || files.length === 0) return [] as any[]
            const MAX_FILES = 3
            const MAX_SINGLE_BYTES = 10 * 1024 * 1024 // 10MB
            const MAX_TOTAL_BYTES = 30 * 1024 * 1024 // 30MB
            if (files.length > MAX_FILES) {
                setClientError(`Máximo de ${MAX_FILES} PDFs por mensagem.`)
                return []
            }
            let total = 0
            for (const f of Array.from(files)) {
                if (f.type !== 'application/pdf') {
                    setClientError(`Arquivo não é PDF: ${f.name}`)
                    return []
                }
                if (f.size > MAX_SINGLE_BYTES) {
                    setClientError(`Arquivo ${f.name} excede 10MB.`)
                    return []
                }
                total += f.size
                if (total > MAX_TOTAL_BYTES) {
                    setClientError('Tamanho total dos PDFs excede 30MB.')
                    return []
                }
            }
            // Convert to Data URLs
            const convertFilesToDataURLs = async (filesLocal: FileList) => {
                return Promise.all(Array.from(filesLocal).map(file => new Promise<any>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        resolve({
                            type: 'file',
                            filename: file.name,
                            mediaType: file.type,
                            url: reader.result as string,
                        })
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })))
            }
            return await convertFilesToDataURLs(files)
        }
        buildFileParts().then(fileParts => {
            if (clientError) return
            const msg = createUserMessage(input, fileParts)
            sendMessage(msg)
        })
        setInput('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        setFiles(undefined)
        setFocusToChatInput()
    }

    const alreadyLoadedProcessMetadata = messages.some(m => m.role === 'assistant' && m.parts?.some(part => part.type === 'tool-getProcessMetadata'))

    // Clear drafts when process number changes (robustness rule)
    useEffect(() => {
        // Reset drafts that are process-sensitive. For simplicity, clear all.
        setModalDrafts({})
    }, [processNumber])

    const sendPrompt = useCallback((text: string) => {
        const msg = createUserMessage(text, [], { suggestion: true })
        sendMessage(msg)
        setFocusToChatInput()
    }, [createUserMessage, sendMessage, setFocusToChatInput])

    const suggestionCtx: SuggestionContext = useMemo(() => ({
        processNumber,
        setProcessNumber: (n?: string) => setProcessNumber(n || ''),
        alreadyLoadedProcessMetadata,
        messages,
        sendPrompt,
    }), [processNumber, alreadyLoadedProcessMetadata, messages, sendPrompt])
    const runSuggestion = (id: string) => {
        setCurrentSuggestion(getAllSuggestions().find(s => s.id === id) || null)
        const result = resolveSuggestion(id, suggestionCtx)
        if (!result) return
        if (result.type === 'immediate') {
            sendPrompt(result.prompt)
            return
        }
        setActiveModalKey(result.key)
        setActiveModalInitial(result.initial)
        setActiveModalSubmitHandler(() => result.onSubmit || null)
    }

    const currentReasoning = messages.length > 0 ? reasoning(messages[messages.length - 1]) : undefined

    return (
        <div className={messages.find(m => m.role === 'assistant') ? '' : 'd-print-none h-print'}>

            <h2>Chat</h2>

            <div className={`alert alert-dark bg-dark text-white p-2 pt-3 pb-3 chat-box ${params.footer ? 'mb-1' : 'mb-3'}`}>
                <div className='container'>
                    {messages.map((m, idx) => (
                        m.role === 'user' ?
                            <div className="row justify-content-end ms-5 g-2 chat-user-container" key={m.id}>
                                <div className={`col col-auto mb-0 icon-container`}>
                                    <FontAwesomeIcon onClick={() => handleEditMessage(idx)} icon={faEdit} className="text-white align-bottom" />
                                </div>
                                <div className={`col col-auto mb-0`}>
                                    <div className={`text-wrap mb-1 rounded chat-content chat-user`} dangerouslySetInnerHTML={{ __html: preprocessar(m, m.role) }} />
                                    {/* Attached PDFs */}
                                    {m.parts?.filter((p: any) => p.type === 'file' && p.mediaType === 'application/pdf').length > 0 && (
                                        <div className="mb-3 mt-1">
                                            {m.parts.filter((p: any) => p.type === 'file' && p.mediaType === 'application/pdf').map((p: any, i: number) => (
                                                <span key={i} className="badge bg-primary text-white me-1 mb-1">
                                                    <FontAwesomeIcon icon={faFileLines} className="me-1" />
                                                    {p.filename || 'arquivo.pdf'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            : m.role === 'assistant' &&
                            <div className="row justify-content-start me-5" key={m.id}>
                                {
                                    currentReasoning && idx === messages.length - 1
                                    && <Reasoning currentReasoning={currentReasoning} showReasoning={showReasoning} setShowReasoning={setShowReasoning} />
                                }
                                {
                                    m?.parts?.find((part) => part.type.startsWith('tool-')) && <div className="mb-1">
                                        {m?.parts?.filter((part) => part.type.startsWith('tool-'))?.map((part, index) => (
                                            <div key={index} className="mb-0">
                                                <div className={`text-wrap mb-0 chat-tool`}>
                                                    {toolMessage(part)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                                {
                                    hasText(m) &&
                                    <div className={`col col-auto mb-0`}>
                                        <div className={`text-wrap mb-3 rounded chat-content chat-ai`} dangerouslySetInnerHTML={{ __html: preprocessar(m, m.role) }} />
                                    </div>
                                }
                            </div>
                    ))}

                    {error && <div className="row justify-content-start">
                        <div className={`col col-auto mb-0`}>
                            <div className={true ? 'alert alert-danger' : `text-wrap mb-3 rounded text-danger`}>
                                <button type="button" className="btn-close float-end" data-bs-dismiss="alert" aria-label="Close" onClick={(e) => { e.preventDefault(); clearError() }}></button>
                                <b>Erro:</b> <ErrorMessage message={error.message} />
                            </div>
                        </div>
                    </div>}
                    {clientError && <div className="row justify-content-start">
                        <div className="col col-auto mb-0">
                            <div className='alert alert-warning'>
                                <button type="button" className="btn-close float-end" aria-label="Close" onClick={(e) => { e.preventDefault(); setClientError(null) }}></button>
                                <b>Aviso:</b> <ErrorMessage message={clientError} />
                            </div>
                        </div>
                    </div>}

                    <div className="rowx h-print">
                        <div className="xcol xcol-12">
                            <form onSubmit={handleSubmitAndSetFocus} className="mt-auto">
                                <div className="input-group">
                                    <button className="btn btn-secondary btn-outline-light" type="button" onClick={() => fileInputRef.current?.click()} title="Anexar PDFs">
                                        <FontAwesomeIcon icon={faPaperclip} />
                                    </button>
                                    <TextareaAutosize
                                        id="chat-input"
                                        className="form-control bg-secondary text-white"
                                        value={input}
                                        placeholder=""
                                        onChange={(e) => setInput(e.target.value)}
                                        minRows={1}
                                        maxRows={8}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                // submit
                                                const form = (e.currentTarget as any).closest('form') as HTMLFormElement
                                                if (form) {
                                                    e.preventDefault()
                                                    form.requestSubmit()
                                                }
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button className="btn btn-secondary btn-outline-light" type="submit">Enviar</button>
                                </div>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files) setFiles(e.target.files)
                                    }}
                                />
                                {files && files.length > 0 && <div className="mt-2 small d-flex flex-wrap align-items-center">
                                    {Array.from(files).map((f, i) => (
                                        <span key={i} className="badge bg-primary text-white me-1 mb-1">
                                            <FontAwesomeIcon icon={faFileLines} className="me-1" />
                                            {f.name}
                                        </span>
                                    ))}
                                    <button
                                        type="button"
                                        className="badge bg-secondary text-white border-0 me-1 mb-1"
                                        style={{ cursor: 'pointer' }}
                                        title="Remover anexos"
                                        onClick={() => { setFiles(undefined); if (fileInputRef.current) fileInputRef.current.value = '' }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>}
                            </form>
                        </div>
                    </div>

                    <div className="mt-1 text-center">
                        {getAllSuggestions().map(s => (
                            <button className="btn btn-sm btn-outline-secondary mt-2 ms-1 me-1" onClick={() => runSuggestion(s.id)} key={s.id}>
                                {s.icon && <FontAwesomeIcon icon={s.icon} className="me-2" />}
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {params.footer}

            {/* New Modal Host */}
            {activeModalKey && (() => {
                const Comp = currentSuggestion?.modalComponent
                if (!Comp) return null
                const draft = modalDrafts[activeModalKey]
                const onClose = () => { setActiveModalKey(null); setActiveModalInitial(null); setActiveModalSubmitHandler(null) }
                const onSubmit = (values: any) => {
                    // Save draft
                    setModalDrafts(prev => ({ ...prev, [activeModalKey]: values }))
                    // Delegate to suggestion-provided handler or fallback generic behavior for legacy simple modal
                    if (activeModalSubmitHandler) {
                        try { activeModalSubmitHandler(values, suggestionCtx) } catch (e) { console.error(e) }
                    } else if (activeModalKey === 'ask-process-number') {
                        // Legacy fallback: send current suggestion with number
                        const numero = values?.processNumber?.trim()
                        if (numero) {
                            handleProcessNumberChange(numero)
                            // legacy currentSuggestion logic removed after refactor
                        }
                    }
                    onClose()
                }
                const CompAny: any = Comp
                return (
                    <CompAny show={true} context={suggestionCtx} initial={activeModalInitial} draft={draft} onSubmit={onSubmit} onClose={onClose} />
                )
            })()}
        </div>
    );
}