'use client'

import React, { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { Container, Row, Col, Form, Button, Table, Spinner } from 'react-bootstrap'
import { maiusculasEMinusculas } from '@/lib/utils/utils'

function formatDate(dt?: Date | null) {
    if (!dt) return ''
    return dayjs(dt).format('DD/MM/YYYY HH:mm')
}

interface Props { usdBrl?: number | null }

export default function IAUsageReportClient({ usdBrl }: Props) {
    const [cpfInput, setCpfInput] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [groupBy, setGroupBy] = useState<'process' | 'user'>('process')
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    const cpfs = useMemo(() => cpfInput.split(',').map(c => c.trim()).filter(Boolean), [cpfInput])

    async function load(e?: React.FormEvent) {
        e?.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/v1/report/ai-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpfs, startDate, endDate, groupBy })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            setRows(data.rows || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const grandTotals = useMemo(() => rows.reduce((acc, r) => ({
        generations: acc.generations + r.generations_count,
        cost: acc.cost + r.approximate_cost_sum
    }), { generations: 0, cost: 0 }), [rows])

    const grandTotalsBRL = useMemo(() => ({
        cost: usdBrl ? grandTotals.cost * usdBrl : 0
    }), [grandTotals, usdBrl])

    const formatterBRL = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), [])
    const formatterUSD = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }), [])

    // Build grouped structure for rowspan rendering
    const groups = useMemo(() => {
        const keyed: Record<string, any[]> = {}
        rows.forEach(r => {
            const key = groupBy === 'process' ? r.dossier_code : r.username
            const finalKey = key || ''
            if (!keyed[finalKey]) keyed[finalKey] = []
            keyed[finalKey].push(r)
        })
        return Object.entries(keyed).map(([key, arr]) => {
            const totals = arr.reduce((acc, r) => ({
                generations_count: acc.generations_count + r.generations_count,
                approximate_cost_sum: acc.approximate_cost_sum + r.approximate_cost_sum
            }), { generations_count: 0, approximate_cost_sum: 0 })
            const hasSubtotal = arr.length > 1
            const rowSpan = arr.length + (hasSubtotal ? 1 : 0)
            return { key, rows: arr, totals, hasSubtotal, rowSpan }
        })
    }, [rows, groupBy])

    return (
        <Container fluid="md" className="py-4">
            <h1 className="h3 mb-4">Relatório de Uso de IA</h1>
            <Form onSubmit={load} className="mb-3">
                <Row className="g-3 align-items-end">
                    <Col sm={12} md={4} >
                        <Form.Group controlId="cpfs">
                            <Form.Label>CPFs</Form.Label>
                            <Form.Control placeholder="CPFs separados por vírgula (opcional)" value={cpfInput} onChange={e => setCpfInput(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col sm={6} md={2}>
                        <Form.Group controlId="startDate">
                            <Form.Label>Data Início</Form.Label>
                            <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col sm={6} md={2}>
                        <Form.Group controlId="endDate">
                            <Form.Label>Data Fim</Form.Label>
                            <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col xs={6} md={2}>
                        <Form.Group controlId="groupBy">
                            <Form.Label>Agrupar por</Form.Label>
                            <Form.Select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
                                <option value='process'>Processo</option>
                                <option value='user'>Usuário</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col xs={6} md={3} lg={2} className="d-grid">
                        <Button type="submit" variant="primary" disabled={loading}>{loading && <Spinner size="sm" className="me-2" />}Consultar</Button>
                    </Col>
                </Row>
            </Form>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="table-responsive">
                <Table striped bordered hover size="sm" className="align-middle">
                    <thead className="table-light">
                        <tr>
                            {groupBy === 'process' && <th>Processo</th>}
                            {groupBy === 'user' && <th>Usuário</th>}
                            {(groupBy === 'user') && <th>Processo</th>}
                            {(groupBy === 'process') && <th>Usuário</th>}
                            <th>Primeiro Uso</th>
                            <th>Último Uso</th>
                            <th className="text-end">Usos</th>
                            <th className="text-end">Consumo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(group => {
                            const first = group.rows[0]
                            const groupValue = groupBy === 'process' ? first.dossier_code : (maiusculasEMinusculas(first.user_name) || first.username)
                            return (
                                <React.Fragment key={group.key || 'blank'}>
                                    <tr>
                                        <td rowSpan={group.rowSpan}>{groupValue}</td>
                                        <td>{groupBy === 'process' ? (maiusculasEMinusculas(first.user_name) || first.username) : first.dossier_code}</td>
                                        <td>{formatDate(first.first_generation_at)}</td>
                                        <td>{formatDate(first.last_generation_at)}</td>
                                        <td className="text-end">{first.generations_count}</td>
                                        <td className="text-end">{usdBrl ? formatterBRL.format(first.approximate_cost_sum * usdBrl) : '-'}</td>
                                    </tr>
                                    {group.rows.slice(1).map((r, idx) => (
                                        <tr key={(group.key || 'blank') + '-' + idx}>
                                            <td>{groupBy === 'process' ? (maiusculasEMinusculas(r.user_name) || r.username) : r.dossier_code}</td>
                                            <td>{formatDate(r.first_generation_at)}</td>
                                            <td>{formatDate(r.last_generation_at)}</td>
                                            <td className="text-end">{r.generations_count}</td>
                                            <td className="text-end">{usdBrl ? formatterBRL.format(r.approximate_cost_sum * usdBrl) : '-'}</td>
                                        </tr>
                                    ))}
                                    {group.hasSubtotal && (
                                        <tr className="table-warning fw-semibold">
                                            {/* grouping cell already occupied via rowSpan */}
                                            <td colSpan={3}>{groupBy === 'process' ? 'Subtotal do Processo' : 'Subtotal do Usuário'}</td>
                                            <td className="text-end">{group.totals.generations_count}</td>
                                            <td className="text-end">{usdBrl ? formatterBRL.format(group.totals.approximate_cost_sum * usdBrl) : '-'}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                        {rows.length === 0 && !loading && <tr><td colSpan={6} className="text-center text-muted">Nenhum dado</td></tr>}
                    </tbody>
                    <tfoot>
                        <tr className="table-secondary fw-semibold">
                            <td colSpan={4}>Total Geral</td>
                            <td className="text-end">{grandTotals.generations}</td>
                            <td className="text-end">{usdBrl ? formatterBRL.format(grandTotalsBRL.cost) : '-'}</td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
            <div className="mb-2 small text-muted">
                {usdBrl ? <>Cotação usada: 1 USD = {formatterBRL.format(usdBrl)} (PTAX)</> : 'Cotação indisponível'}
            </div>
        </Container>
    )
}
