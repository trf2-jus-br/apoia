'use client'

import { maiusculasEMinusculas } from '@/lib/utils/utils'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'

type TicketKind = 'ERRO' | 'DUVIDA' | 'SUGESTAO'

const KIND_LABELS: Record<TicketKind, string> = {
    ERRO: 'Erro',
    DUVIDA: 'Dúvida',
    SUGESTAO: 'Sugestão',
}

// Captura a tela atual (DOM) como JPEG. Roda no cliente; a imagem só sai do
// navegador se o usuário enviar o chamado com a opção de anexo marcada.
// Modais e backdrops são excluídos da captura: como ela ocorre com a
// TicketFormModal já aberta, a própria modal apareceria na imagem.
const captureScreenshot = async (): Promise<Blob | null> => {
    try {
        const html2canvas = (await import('html2canvas')).default
        const width = Math.max(document.documentElement.scrollWidth, window.innerWidth)
        const scale = Math.min(1, 1600 / width)
        const canvas = await html2canvas(document.body, {
            scale,
            logging: false,
            useCORS: true,
            ignoreElements: el => el.classList?.contains('modal') || el.classList?.contains('modal-backdrop'),
        })
        return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.7))
    } catch {
        return null
    }
}

export function TicketFormModal({ show, onHide, kind, errorContext, encryptedErrorContext, userName, userEmail }: {
    show: boolean
    onHide: () => void
    kind?: TicketKind
    errorContext?: string
    encryptedErrorContext?: string
    userName?: string
    userEmail?: string
}) {
    const [message, setMessage] = useState('')
    const [selectedKind, setSelectedKind] = useState<TicketKind>(kind || 'DUVIDA')
    const [includeScreenshot, setIncludeScreenshot] = useState(true)
    const [screenshot, setScreenshot] = useState<Blob | null>(null)
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdUuid, setCreatedUuid] = useState<string | null>(null)
    const capturedRef = useRef(false)

    // Captura a tela quando o modal abre, antes da interação do usuário,
    // para registrar a tela no momento em que o chamado foi iniciado
    useEffect(() => {
        if (!show || capturedRef.current) return
        capturedRef.current = true
        captureScreenshot().then(blob => {
            if (blob) {
                setScreenshot(blob)
                setScreenshotUrl(URL.createObjectURL(blob))
            }
        })
    }, [show])

    useEffect(() => {
        if (show) {
            setMessage('')
            setSelectedKind(kind || 'DUVIDA')
            setIncludeScreenshot(true)
            setError(null)
            setCreatedUuid(null)
            setSending(false)
        } else {
            capturedRef.current = false
            setScreenshot(null)
            if (screenshotUrl) URL.revokeObjectURL(screenshotUrl)
            setScreenshotUrl(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const handleSubmit = async () => {
        if (!message.trim()) {
            setError('Descreva o problema antes de enviar.')
            return
        }
        setSending(true)
        setError(null)
        try {
            const form = new FormData()
            form.append('kind', kind || selectedKind)
            form.append('message', message.trim())
            if (errorContext) form.append('error_context', errorContext)
            if (encryptedErrorContext) form.append('encrypted_error_context', encryptedErrorContext)
            form.append('page_url', window.location.href)
            if (includeScreenshot && screenshot) {
                form.append('screenshot', screenshot, 'screenshot.jpg')
            }
            const res = await fetch('/api/v1/ticket', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.errormsg || 'Não foi possível abrir o chamado')
            setCreatedUuid(data.uuid)
        } catch (err: any) {
            setError(err.message || 'Não foi possível abrir o chamado')
        } finally {
            setSending(false)
        }
    }

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Abrir chamado</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {createdUuid
                    ? <Alert variant="success" className="mb-0">
                        Chamado aberto com sucesso. Anote o protocolo: <strong>{createdUuid.substring(0, 8)}</strong>.
                        Você pode acompanhar o status em "Meus chamados" no menu do usuário.
                    </Alert>
                    : <>
                        {(userName || userEmail) && (
                            <p className="text-muted small mb-3">
                                Solicitante: {maiusculasEMinusculas(userName)}{userEmail ? ` (${userEmail})` : ''}
                            </p>
                        )}
                        {error && <Alert variant="danger">{error}</Alert>}
                        {!kind && (
                            <Form.Group className="mb-3">
                                <Form.Label>Tipo</Form.Label>
                                <Form.Select value={selectedKind} onChange={e => setSelectedKind(e.target.value as TicketKind)}>
                                    {Object.entries(KIND_LABELS).map(([value, label]) =>
                                        <option key={value} value={value}>{label}</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Descreva o problema</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="O que você estava fazendo quando o problema ocorreu? O que esperava que acontecesse?"
                            />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Check
                                type="checkbox"
                                id="ticket-include-screenshot"
                                label="Anexar captura de tela atual"
                                checked={includeScreenshot && !!screenshot}
                                disabled={!screenshot}
                                onChange={e => setIncludeScreenshot(e.target.checked)}
                            />
                            {!screenshot && (
                                <Form.Text className="text-muted">Captura de tela indisponível neste navegador.</Form.Text>
                            )}
                        </Form.Group>
                        {includeScreenshot && screenshotUrl && (
                            <div className="border rounded p-1 mb-2" style={{ maxHeight: 200, overflow: 'hidden' }}>
                                <img src={screenshotUrl} alt="Captura de tela a ser anexada" style={{ maxWidth: '100%' }} />
                            </div>
                        )}
                    </>}
            </Modal.Body>
            {!createdUuid && (
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={sending}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={sending}>
                        {sending ? <><Spinner size="sm" className="me-2" />Enviando...</> : 'Enviar chamado'}
                    </Button>
                </Modal.Footer>
            )}
        </Modal>
    )
}

// Botão/gatilho autocontido: renderiza um link que abre o TicketFormModal.
// className permite usar como item de dropdown (className="dropdown-item").
export default function TicketFormButton({ label, className, kind, errorContext, userName, userEmail }: {
    label: string
    className?: string
    kind?: TicketKind
    errorContext?: string
    userName?: string
    userEmail?: string
}) {
    const [show, setShow] = useState(false)
    return (
        <>
            <a href="#" className={className} onClick={e => { e.preventDefault(); setShow(true) }}>
                {label}
            </a>
            <TicketFormModal
                show={show}
                onHide={() => setShow(false)}
                kind={kind}
                errorContext={errorContext}
                userName={userName}
                userEmail={userEmail}
            />
        </>
    )
}
