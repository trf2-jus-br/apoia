'use client'

import React, { useState, useMemo, useEffect } from 'react'
import dayjs from 'dayjs'
import { Container, Row, Col, Form, Button, Table, Spinner } from 'react-bootstrap'
import { maiusculasEMinusculas } from '@/lib/utils/utils'
import Print from '@/components/slots/print'

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

    // Limpa os registros quando filtros mudam (não depende de rows para evitar warning de dependências)
    useEffect(() => {
        setRows([])
    }, [cpfInput, startDate, endDate, groupBy])

    const cpfs = useMemo(() => cpfInput.split(',').map(c => c.replace(/\D/g, '').trim()).filter(Boolean), [cpfInput])
    const noCpfsProvided = cpfs.length === 0
    const effectiveGroupBy = useMemo<'process' | 'user'>(() => (groupBy === 'user' && noCpfsProvided) ? 'process' : groupBy, [groupBy, noCpfsProvided])

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
            const key = effectiveGroupBy === 'process' ? r.dossier_code : r.username
            const finalKey = key || ''
            if (!keyed[finalKey]) keyed[finalKey] = []
            keyed[finalKey].push(r)
        })
        return Object.entries(keyed).map(([key, arr]) => {
            const totals = arr.reduce((acc, r) => ({
                generations_count: acc.generations_count + r.generations_count,
                approximate_cost_sum: acc.approximate_cost_sum + r.approximate_cost_sum
            }), { generations_count: 0, approximate_cost_sum: 0 })
            const hasSubtotal = arr.length > 1 && !(noCpfsProvided && groupBy === 'user') // oculta subtotal do usuário quando não há CPFs
            const rowSpan = arr.length + (hasSubtotal ? 1 : 0)
            return { key, rows: arr, totals, hasSubtotal, rowSpan }
        })
    }, [rows, effectiveGroupBy, noCpfsProvided, groupBy])

    return (
        <Container fluid="md" className="py-4">
            <h1 className="h3 mb-4">Relatório de Uso de IA</h1>
            {/* Seção cabeçalho para impressão */}
            <div className="d-none d-print-block mb-3 small border rounded p-2">
                <strong>Filtros:</strong><br />
                {cpfs.length > 0 && <div><strong>CPFs:</strong> {cpfs.join(', ')}</div>}
                {(!cpfs.length) && <div><strong>CPFs:</strong> (não informado)</div>}
                <div><strong>Data Início:</strong> {startDate || '(não informada)'}</div>
                <div><strong>Data Fim:</strong> {endDate || '(não informada)'}</div>
                <div><strong>Agrupado por:</strong> {groupBy === 'process' ? 'Processo' : 'Usuário'}</div>
            </div>
            <Form onSubmit={load} className="mb-3 d-print-none">
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
                <Table striped hover size="sm" className="align-middle">
                    <thead className="table-light">
                        <tr>
                            {effectiveGroupBy === 'process' && <th>Processo</th>}
                            {effectiveGroupBy === 'user' && <th>Usuário</th>}
                            {/* segunda coluna (eixo cruzado) somente se não for modo usuário único sem CPFs */}
                            {!(noCpfsProvided && groupBy === 'user') && (
                                effectiveGroupBy === 'process' ? (!noCpfsProvided && <th>Usuário</th>) : <th>Processo</th>
                            )}
                            <th>Primeiro Uso</th>
                            <th>Último Uso</th>
                            <th className="text-end">Usos</th>
                            <th className="text-end">Consumo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(group => {
                            const first = group.rows[0]
                            const groupValue = effectiveGroupBy === 'process' ? first.dossier_code : (maiusculasEMinusculas(first.user_name) || first.username)
                            const showOtherAxis = !(noCpfsProvided && groupBy === 'user') && (effectiveGroupBy === 'user' || !noCpfsProvided)
                            const otherAxisFirst = effectiveGroupBy === 'process' ? (maiusculasEMinusculas(first.user_name) || first.username) : first.dossier_code
                            const subtotalColSpan = (showOtherAxis ? 1 : 0) + 2 // (other axis?) + Primeiro + Último
                            return (
                                <React.Fragment key={group.key || 'blank'}>
                                    <tr>
                                        <td rowSpan={group.rowSpan}>{groupValue}</td>
                                        {showOtherAxis && <td>{otherAxisFirst}</td>}
                                        <td>{formatDate(first.first_generation_at)}</td>
                                        <td>{formatDate(first.last_generation_at)}</td>
                                        <td className="text-end">{first.generations_count}</td>
                                        <td className="text-end">{usdBrl ? formatterBRL.format(first.approximate_cost_sum * usdBrl) : '-'}</td>
                                    </tr>
                                    {group.rows.slice(1).map((r, idx) => (
                                        <tr key={(group.key || 'blank') + '-' + idx}>
                                            {showOtherAxis && <td>{effectiveGroupBy === 'process' ? (maiusculasEMinusculas(r.user_name) || r.username) : r.dossier_code}</td>}
                                            <td>{formatDate(r.first_generation_at)}</td>
                                            <td>{formatDate(r.last_generation_at)}</td>
                                            <td className="text-end">{r.generations_count}</td>
                                            <td className="text-end">{usdBrl ? formatterBRL.format(r.approximate_cost_sum * usdBrl) : '-'}</td>
                                        </tr>
                                    ))}
                                    {group.hasSubtotal && (
                                        <tr className="table-warning fw-semibold">
                                            <td colSpan={subtotalColSpan}>{effectiveGroupBy === 'process' ? 'Subtotal do Processo' : 'Subtotal do Usuário'}</td>
                                            <td className="text-end">{group.totals.generations_count}</td>
                                            <td className="text-end">{usdBrl ? formatterBRL.format(group.totals.approximate_cost_sum * usdBrl) : '-'}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                        {rows.length === 0 && !loading && (() => { const totalCols = 1 + ( (effectiveGroupBy === 'user' || !noCpfsProvided) ? 1 : 0 ) + 2 + 2; return <tr><td colSpan={totalCols} className="text-center text-muted">Nenhum dado</td></tr> })()}
                    </tbody>
                    <tfoot>
                        {(() => { const showOtherAxis = !(noCpfsProvided && groupBy === 'user') && (effectiveGroupBy === 'user' || !noCpfsProvided); const footerColSpan = 1 + (showOtherAxis ? 1 : 0) + 2; return (
                        <tr className="table-secondary fw-semibold">
                            <td colSpan={footerColSpan}>Total Geral</td>
                            <td className="text-end">{grandTotals.generations}</td>
                            <td className="text-end">{usdBrl ? formatterBRL.format(grandTotalsBRL.cost) : '-'}</td>
                        </tr>) })()}
                    </tfoot>
                </Table>
            </div>
            <div className="mb-2 small text-muted">
                {usdBrl ? <>Cotação usada: 1 USD = {formatterBRL.format(usdBrl)} (PTAX)</> : 'Cotação indisponível'}
            </div>
        </Container>
    )
}
