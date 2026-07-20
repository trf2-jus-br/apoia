'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import dayjs from 'dayjs'
import { maiusculasEMinusculas } from '@/lib/utils/utils'

interface TicketItem {
    id: string
    username: string | null
    user_name: string | null
    user_email: string | null
    system: string | null
    court_id: number | null
    kind: 'ERRO' | 'DUVIDA' | 'SUGESTAO'
    message: string
    page_url: string | null
    status: 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO'
    response: string | null
    responded_by: string | null
    responded_at: string | null
    screenshot_content_type: string | null
    created_at: string
}

interface TicketDetail extends TicketItem {
    user_agent: string | null
    errorStack: string | null
    hasScreenshot: boolean
}

interface TicketStats {
    byStatus: { status: string, count: number }[]
    last7Days: number
    avgResolutionHours: number | null
    byCourt: { court_id: number | null, count: number }[]
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

const fmtDate = (dt: string | null) => dt ? dayjs(dt).format('DD/MM/YYYY HH:mm') : '-'

export default function TicketsAdminClient() {
    const [items, setItems] = useState<TicketItem[]>([])
    const [stats, setStats] = useState<TicketStats | null>(null)
    const [courts, setCourts] = useState<Record<number, string>>({})
    const [statusFilter, setStatusFilter] = useState('ABERTO')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [detail, setDetail] = useState<TicketDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [editStatus, setEditStatus] = useState('')
    const [editResponse, setEditResponse] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const courtName = (courtId: number | null) =>
        courtId == null ? '-' : (courts[courtId] ? `${courts[courtId]} (${courtId})` : `Tribunal ${courtId}`)

    const fetchTickets = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const url = statusFilter ? `/api/v1/admin/ticket?status=${statusFilter}` : '/api/v1/admin/ticket'
            const res = await fetch(url)
            const data = await res.json()
            if (!res.ok) throw new Error(data.errormsg || 'Erro ao carregar chamados')
            setItems(data.items || [])
            setStats(data.stats || null)
            setCourts(data.courts || {})
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar chamados')
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => {
        fetchTickets()
    }, [fetchTickets])

    const openDetail = async (ticket: TicketItem) => {
        setDetailLoading(true)
        setSaveError(null)
        try {
            const res = await fetch(`/api/v1/admin/ticket/${ticket.id}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.errormsg || 'Erro ao carregar detalhes')
            setDetail(data)
            setEditStatus(data.status)
            setEditResponse(data.response || '')
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar detalhes')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleSave = async () => {
        if (!detail) return
        setSaving(true)
        setSaveError(null)
        try {
            const res = await fetch(`/api/v1/admin/ticket/${detail.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: editStatus, response: editResponse }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.errormsg || 'Erro ao salvar')
            setDetail(null)
            fetchTickets()
        } catch (err: any) {
            setSaveError(err.message || 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const statusCount = (status: string) => stats?.byStatus.find(s => s.status === status)?.count ?? 0

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Chamados</h2>

            {stats && (
                <Row className="mb-4">
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Abertos</div>
                            <div className="fs-4 text-danger">{statusCount('ABERTO')}</div>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Em análise</div>
                            <div className="fs-4 text-warning">{statusCount('EM_ANALISE')}</div>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Resolvidos</div>
                            <div className="fs-4 text-success">{statusCount('RESOLVIDO')}</div>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Novos (7 dias)</div>
                            <div className="fs-4">{stats.last7Days}</div>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Tempo médio</div>
                            <div className="fs-4">
                                {stats.avgResolutionHours != null ? `${Math.round(stats.avgResolutionHours)}h` : '-'}
                            </div>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card body>
                            <div className="text-muted small">Top tribunais</div>
                            <div className="fs-4">
                                {stats.byCourt.length === 0 && <div>-</div>}
                                {stats.byCourt.map(c => (
                                    <div key={c.court_id ?? 'null'} className="text-truncate">
                                        {c.court_id != null && courts[c.court_id] ? courts[c.court_id] : `Tribunal ${c.court_id}`}: {c.count}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <div className="d-flex align-items-center mb-3">
                <Form.Select
                    style={{ maxWidth: 220 }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">Todos os status</option>
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ANALISE">Em análise</option>
                    <option value="RESOLVIDO">Resolvido</option>
                </Form.Select>
                <Button variant="outline-secondary" className="ms-2" onClick={fetchTickets}>
                    Atualizar
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {loading && <Spinner animation="border" />}

            {!loading && !error && items.length === 0 && (
                <p className="text-muted">Nenhum chamado encontrado.</p>
            )}

            {!loading && items.length > 0 && (
                <Table striped hover responsive>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Protocolo</th>
                            <th>Solicitante</th>
                            <th>Email</th>
                            <th>Tribunal</th>
                            <th>Tipo</th>
                            <th>Status</th>
                            <th>Mensagem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(ticket => {
                            const status = STATUS_LABELS[ticket.status] || { label: ticket.status, variant: 'secondary' }
                            return (
                                <tr key={ticket.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(ticket)}>
                                    <td className="text-nowrap">{fmtDate(ticket.created_at)}</td>
                                    <td title={ticket.id}>{ticket.id.substring(0, 8)}</td>
                                    <td>{maiusculasEMinusculas(ticket.user_name || ticket.username || '-')}</td>
                                    <td>{ticket.user_email || '-'}</td>
                                    <td className="text-truncate" style={{ maxWidth: 200 }}>{courtName(ticket.court_id)}</td>
                                    <td>{KIND_LABELS[ticket.kind] || ticket.kind}</td>
                                    <td><Badge bg={status.variant}>{status.label}</Badge></td>
                                    <td className="text-truncate" style={{ maxWidth: 300 }}>{ticket.message}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </Table>
            )}

            <Modal show={detailLoading || !!detail} onHide={() => setDetail(null)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalhes do chamado</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detailLoading && <Spinner animation="border" />}
                    {detail && (
                        <>
                            {saveError && <Alert variant="danger">{saveError}</Alert>}
                            <Table size="sm" borderless>
                                <tbody>
                                    <tr><td className="text-muted" style={{ width: 160 }}>Protocolo</td><td>{detail.id}</td></tr>
                                    <tr><td className="text-muted">Data</td><td>{fmtDate(detail.created_at)}</td></tr>
                                    <tr><td className="text-muted">Solicitante</td><td>{detail.user_name || '-'}</td></tr>
                                    <tr><td className="text-muted">Email</td><td>{detail.user_email || '-'}</td></tr>
                                    <tr><td className="text-muted">Usuário</td><td>{detail.username || '-'}</td></tr>
                                    <tr><td className="text-muted">Sistema</td><td>{detail.system || '-'}</td></tr>
                                    <tr><td className="text-muted">Tribunal</td><td>{courtName(detail.court_id)}</td></tr>
                                    <tr><td className="text-muted">Tipo</td><td>{KIND_LABELS[detail.kind] || detail.kind}</td></tr>
                                    <tr><td className="text-muted">Página</td><td className="text-break">{detail.page_url || '-'}</td></tr>
                                    <tr><td className="text-muted">Navegador</td><td className="text-break small">{detail.user_agent || '-'}</td></tr>
                                    {detail.responded_at && (
                                        <tr><td className="text-muted">Respondido</td><td>{fmtDate(detail.responded_at)} por {detail.responded_by || '-'}</td></tr>
                                    )}
                                </tbody>
                            </Table>

                            <h6>Mensagem</h6>
                            <div className="border rounded p-2 mb-3" style={{ whiteSpace: 'pre-wrap' }}>{detail.message}</div>

                            {detail.errorStack && (
                                <>
                                    <h6>Stack do erro</h6>
                                    <pre className="border rounded p-2 mb-3 small" style={{ maxHeight: 200, overflow: 'auto' }}>
                                        {detail.errorStack}
                                    </pre>
                                </>
                            )}

                            {detail.hasScreenshot && (
                                <>
                                    <h6>Captura de tela</h6>
                                    <div className="border rounded p-1 mb-3">
                                        <img
                                            src={`/api/v1/ticket/${detail.id}/screenshot`}
                                            alt="Captura de tela anexada ao chamado"
                                            style={{ maxWidth: '100%' }}
                                        />
                                    </div>
                                </>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                    <option value="ABERTO">Aberto</option>
                                    <option value="EM_ANALISE">Em análise</option>
                                    <option value="RESOLVIDO">Resolvido</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Resposta ao solicitante</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={editResponse}
                                    onChange={e => setEditResponse(e.target.value)}
                                    placeholder="Visível para o usuário em Meus chamados"
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                {detail && (
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setDetail(null)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? <><Spinner size="sm" className="me-2" />Salvando...</> : 'Salvar'}
                        </Button>
                    </Modal.Footer>
                )}
            </Modal>
        </Container>
    )
}
