'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { EvaluationStatsResult } from '@/lib/db/mysql-types'

const fmtPct = (rate: number | null) => rate == null ? '-' : `${(rate * 100).toFixed(1)}%`

const fmtDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const fmtDay = (day: string) => {
    const [y, m, d] = day.split('-')
    return `${d}/${m}`
}

const defaultStartDate = () => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
}

export default function EvaluationsAdminClient() {
    const [startDate, setStartDate] = useState(defaultStartDate())
    const [endDate, setEndDate] = useState('')
    const [model, setModel] = useState('')
    const [prompt, setPrompt] = useState('')
    const [data, setData] = useState<EvaluationStatsResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const qs = new URLSearchParams()
            if (startDate) qs.set('startDate', startDate)
            if (endDate) qs.set('endDate', endDate)
            if (model) qs.set('model', model)
            if (prompt) qs.set('prompt', prompt)
            const res = await fetch(`/api/v1/admin/evaluation-stats?${qs.toString()}`)
            if (!res.ok) throw new Error(`Erro ao carregar estatísticas (HTTP ${res.status})`)
            setData(await res.json())
        } catch (e) {
            setError((e as Error)?.message || 'Erro ao carregar estatísticas')
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate, model, prompt])

    useEffect(() => { load() }, [load])

    return <div className="container mt-3">
        <h2 className="mb-3">Avaliações de IA</h2>

        <div className="row g-2 mb-3 d-print-none">
            <div className="col col-auto">
                <label className="form-label mb-1">Início</label>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="col col-auto">
                <label className="form-label mb-1">Fim</label>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col col-auto">
                <label className="form-label mb-1">Modelo</label>
                <select className="form-select" value={model} onChange={e => setModel(e.target.value)}>
                    <option value="">Todos</option>
                    {data?.availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div className="col col-auto">
                <label className="form-label mb-1">Prompt</label>
                <select className="form-select" value={prompt} onChange={e => setPrompt(e.target.value)}>
                    <option value="">Todos</option>
                    {data?.availablePrompts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {loading && !error && <div className="alert alert-info">Carregando estatísticas...</div>}

        {data && !loading && !error && <>
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-title text-muted">Avaliações negativas</h6>
                            <p className="card-text fs-3 mb-0">{data.summary.totalEvaluations.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-title text-muted">Gerações no período</h6>
                            <p className="card-text fs-3 mb-0">{data.summary.totalGenerations.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-title text-muted">Taxa de reprovação</h6>
                            <p className="card-text fs-3 mb-0">{fmtPct(data.summary.evaluationRate)}</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="card-title text-muted">Motivo mais frequente</h6>
                            <p className="card-text fs-5 mb-0">{data.summary.topReason || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <h5>Avaliações por motivo</h5>
                    {data.byReason.length === 0
                        ? <div className="alert alert-secondary">Nenhuma avaliação no período.</div>
                        : <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.byReason} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="reason" width={160} tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Avaliações']} />
                                    <Bar dataKey="evaluations" fill="#dc3545" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>}
                </div>
                <div className="col-md-6">
                    <h5>Avaliações por dia</h5>
                    {data.byDay.length === 0
                        ? <div className="alert alert-secondary">Nenhuma geração no período.</div>
                        : <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.byDay.map(r => ({ ...r, day: fmtDay(r.day) }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('pt-BR'), name === 'evaluations' ? 'Avaliações' : 'Gerações']} />
                                    <Bar dataKey="generations" fill="#dee2e6" name="generations" />
                                    <Bar dataKey="evaluations" fill="#dc3545" name="evaluations" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>}
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <h5>Por modelo</h5>
                    <div className="table-responsive">
                        <table className="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Modelo</th>
                                    <th className="text-end">Gerações</th>
                                    <th className="text-end">Avaliações</th>
                                    <th className="text-end">Taxa</th>
                                    <th>Motivo mais frequente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byModel.map(r => <tr key={r.model}>
                                    <td>{r.model}</td>
                                    <td className="text-end">{r.generations.toLocaleString('pt-BR')}</td>
                                    <td className="text-end">{r.evaluations.toLocaleString('pt-BR')}</td>
                                    <td className="text-end">{fmtPct(r.evaluationRate)}</td>
                                    <td>{r.topReason || '-'}</td>
                                </tr>)}
                                {data.byModel.length === 0 && <tr><td colSpan={5} className="text-muted">Nenhuma geração no período.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="col-md-6">
                    <h5>Por prompt</h5>
                    <div className="table-responsive">
                        <table className="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Prompt</th>
                                    <th className="text-end">Gerações</th>
                                    <th className="text-end">Avaliações</th>
                                    <th className="text-end">Taxa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byPrompt.map(r => <tr key={r.prompt_name}>
                                    <td>{r.prompt_name}</td>
                                    <td className="text-end">{r.generations.toLocaleString('pt-BR')}</td>
                                    <td className="text-end">{r.evaluations.toLocaleString('pt-BR')}</td>
                                    <td className="text-end">{fmtPct(r.evaluationRate)}</td>
                                </tr>)}
                                {data.byPrompt.length === 0 && <tr><td colSpan={4} className="text-muted">Nenhuma geração no período.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <h5>Últimas avaliações</h5>
            <div className="table-responsive mb-4">
                <table className="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Prompt</th>
                            <th>Modelo</th>
                            <th>Motivo</th>
                            <th>Detalhamento</th>
                            <th>Avaliador</th>
                            <th>Dossiê</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recent.map(r => <tr key={r.id}>
                            <td className="text-nowrap">{fmtDateTime(r.created_at as unknown as string)}</td>
                            <td>{r.prompt_name}</td>
                            <td>{r.model}</td>
                            <td>{r.reason || '-'}</td>
                            <td>{r.evaluation_descr || '-'}</td>
                            <td>{r.evaluator_name || r.evaluator_username || '-'}</td>
                            <td>{r.dossier_code || '-'}</td>
                        </tr>)}
                        {data.recent.length === 0 && <tr><td colSpan={7} className="text-muted">Nenhuma avaliação no período.</td></tr>}
                    </tbody>
                </table>
            </div>
        </>}
    </div>
}
