'use client'

import { useState } from 'react'
import { Badge, Card, Container } from 'react-bootstrap'
import dayjs from 'dayjs'

interface TicketItem {
    id: string
    kind: 'ERRO' | 'DUVIDA' | 'SUGESTAO'
    message: string
    status: 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO'
    response: string | null
    screenshot_content_type: string | null
    created_at: string
}

const STATUS_LABELS: Record<string, { label: string, variant: string }> = {
    ABERTO: { label: 'Aberto', variant: 'danger' },
    EM_ANALISE: { label: 'Em análise', variant: 'warning' },
    RESOLVIDO: { label: 'Resolvido', variant: 'success' },
}

const KIND_LABELS: Record<string, string> = {
    ERRO: 'Erro',
    DUVIDA: 'Dúvida',
    SUGESTAO: 'Sugestão',
}

export default function TicketsClient({ items }: { items: TicketItem[] }) {
    const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null)

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Meus chamados</h2>
            {items.length === 0 && (
                <p className="text-muted">Você ainda não abriu nenhum chamado. Use a opção &quot;Ajuda / Abrir chamado&quot; no menu do usuário.</p>
            )}
            {items.map(ticket => {
                const status = STATUS_LABELS[ticket.status] || { label: ticket.status, variant: 'secondary' }
                return (
                    <Card key={ticket.id} className="mb-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>
                                <Badge bg="secondary" className="me-2">{KIND_LABELS[ticket.kind] || ticket.kind}</Badge>
                                <Badge bg={status.variant}>{status.label}</Badge>
                            </span>
                            <span className="text-muted small">
                                {dayjs(ticket.created_at).format('DD/MM/YYYY HH:mm')}
                                <span className="ms-2" title={ticket.id}>Protocolo {ticket.id.substring(0, 8)}</span>
                            </span>
                        </Card.Header>
                        <Card.Body>
                            <Card.Text style={{ whiteSpace: 'pre-wrap' }}>{ticket.message}</Card.Text>
                            {ticket.screenshot_content_type && (
                                <div className="mb-2">
                                    <a
                                        href="#"
                                        onClick={e => {
                                            e.preventDefault()
                                            setExpandedScreenshot(expandedScreenshot === ticket.id ? null : ticket.id)
                                        }}
                                    >
                                        {expandedScreenshot === ticket.id ? 'Ocultar captura de tela' : 'Ver captura de tela anexada'}
                                    </a>
                                    {expandedScreenshot === ticket.id && (
                                        <div className="border rounded p-1 mt-2">
                                            <img
                                                src={`/api/v1/ticket/${ticket.id}/screenshot`}
                                                alt="Captura de tela anexada ao chamado"
                                                style={{ maxWidth: '100%' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {ticket.response && (
                                <div className="alert alert-success mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                    <strong>Resposta do suporte:</strong>
                                    <div>{ticket.response}</div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                )
            })}
        </Container>
    )
}
