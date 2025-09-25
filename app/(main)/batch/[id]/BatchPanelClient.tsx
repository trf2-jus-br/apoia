'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Container, Nav, ProgressBar } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faPlus, faTrash, faFileArrowDown, faClock, faSpinner, faCheck, faTriangleExclamation, faEye, faList } from '@fortawesome/free-solid-svg-icons'
import Fetcher from '@/lib/utils/fetcher'
import CsvNumbersModal from '@/components/modals/CsvNumbersModal'
import TableRecords from '@/components/table-records'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'

type Totals = { total: number, pending: number, running: number, ready: number, error: number }
type Summary = { id: number, name: string, tipo_de_sintese: string, complete: boolean, paused: boolean, totals: Totals, spentCost?: number, estimatedTotalCost?: number }
type Job = { id: number, dossier_code: string, status: 'PENDING' | 'RUNNING' | 'READY' | 'ERROR', attempts: number, started_at?: string, finished_at?: string, duration_ms?: number | null, cost_sum?: number | null }

export default function BatchPanelClient({ id, initialSummary, initialJobs, usdBrl, promptName }: { id: string, initialSummary: Summary, initialJobs: Job[], usdBrl?: number | null, promptName?: string | null }) {
  const [summary, setSummary] = useState<Summary>(initialSummary)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [err, setErr] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'RUNNING' | 'READY' | 'ERROR'>('all')
  const [buildingJobId, setBuildingJobId] = useState<number | null>(null) // job currently being built (optimistic UI)
  const steppingRef = useRef(false)
  const playLoopRef = useRef(false)

  // Stop any background loops on unmount
  useEffect(() => {
    return () => { playLoopRef.current = false; steppingRef.current = false }
  }, [])

  const fixIndex = async () => {
    setErr('')
    setInfo('')
    try {
      setInfo('Otimizando índice, aguarde...')
      const res = await Fetcher.post<any, any>(`/api/v1/batch/${id}/fix-index`, {})
      if (res?.status !== 'OK') throw new Error(res?.errormsg || 'Falha ao otimizar índice')
      setInfo('Índice otimizado com sucesso')
    } catch (e: any) {
      setErr(e?.message || String(e))
      setInfo('')
    }
  }

  const refreshSummary = async () => {
    try {
      const res = await Fetcher.get<any>(`/api/v1/batch/${id}`)
      if (res?.summary) setSummary(res.summary)
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const refreshJobs = async () => {
    try {
      const res = await Fetcher.get<any>(`/api/v1/batch/${id}/jobs?status=all`)
      if (Array.isArray(res?.jobs)) setJobs(res.jobs)
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const doStep = async (job_id?: number) => {
    if (steppingRef.current) return
    steppingRef.current = true
    try {
      if (job_id) setBuildingJobId(job_id)
      // replace status to RUNNING optimistically
      if (job_id) setJobs(js => js.map(j => j.id === job_id ? { ...j, status: 'RUNNING' } : j))
      const res = await Fetcher.post(`/api/v1/batch/${id}/step`, { job_id })
      if (res?.status !== 'OK') throw new Error(res?.errormsg || 'Falha no step')
      return !!res?.processedJobId
    } catch (e: any) {
      setErr(e?.message || String(e))
    } finally {
      if (job_id) setBuildingJobId(null)
      steppingRef.current = false
      try {
        await Promise.all([refreshSummary(), refreshJobs()])
      } catch (e: any) {
        setErr(e?.message || String(e))
      }
    }
  }

  const startPlay = async () => {
    setErr('')
    try {
      await Fetcher.post(`/api/v1/batch/${id}/play`, {})
      await refreshSummary()
      playLoopRef.current = true
      // Start a lightweight polling loop to keep summary fresh during long-running steps
      // ; (async () => {
      //   while (playLoopRef.current) {
      //     try { await refreshSummary() } catch { }
      //     await new Promise(r => setTimeout(r, 10000))
      //   }
      // })()
      // Start processing loop immediately (ref changes don't re-render)
      while (playLoopRef.current) {
        const processed = await doStep()
        if (!processed) { // nothing processed (no pending)
          playLoopRef.current = false
          break
        }
        await new Promise(r => setTimeout(r, 100))
      }
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const pause = async () => {
    setErr('')
    try {
      playLoopRef.current = false
      await Fetcher.post(`/api/v1/batch/${id}/pause`, {})
      await refreshSummary()
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  // No effect-based loop; explicit loop runs inside startPlay

  const onRetry = async (jobId: number, dossier_code?: string) => {
    setErr('')
    try {
      await Fetcher.post(`/api/v1/batch/${id}/jobs`, { action: 'retry', jobId })
      await doStep(jobId)
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const onStop = async (jobId: number, dossier_code?: string) => {
    setErr('')
    try {
      await Fetcher.post(`/api/v1/batch/${id}/jobs`, { action: 'stop', jobId })
      await Promise.all([refreshSummary(), refreshJobs()])
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const onAddNumbers = async (numbers: string[]) => {
    setErr('')
    setInfo('')
    try {
      const res = await Fetcher.post(`/api/v1/batch/${id}/jobs`, { action: 'add', numbers })
      const added = Number(res?.added || 0)
      await Promise.all([refreshSummary(), refreshJobs()])
      if (added > 0) {
        setInfo(`${added} processo(s) adicionado(s).`)
      } else {
        setInfo('Nenhum número válido para adicionar.')
      }
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const onDeleteNumbers = async (numbers: string[]) => {
    setErr('')
    setInfo('')
    try {
      const res = await Fetcher.post(`/api/v1/batch/${id}/jobs`, { action: 'delete', numbers })
      const deleted = Number(res?.deleted || 0)
      await Promise.all([refreshSummary(), refreshJobs()])
      if (deleted > 0) {
        setInfo(`${deleted} processo(s) excluído(s) (apenas itens que não estão em execução podem ser excluídos).`)
        setStatusFilter('all')
      } else {
        setInfo('Nenhum item excluído. Apenas itens que não estão em execução (Aguardando / Pronto / Erro) podem ser excluídos.')
      }
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  const total = summary?.totals?.total || 0
  const ready = summary?.totals?.ready || 0
  const pending = summary?.totals?.pending || 0
  const running = summary?.totals?.running || 0
  const error = summary?.totals?.error || 0
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  // Costs come in USD (approximate_cost). Convert to BRL when exchange rate is available; otherwise format as USD.
  const hasUsdBrl = useMemo(() => typeof usdBrl === 'number' && isFinite(usdBrl as number) && (usdBrl as number) > 0, [usdBrl])
  const toDisplayCurrency = (usd?: number) => {
    if (usd == null) return 0
    return hasUsdBrl ? usd * (usdBrl as number) : usd
  }
  const fmt = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: hasUsdBrl ? 'BRL' : 'USD' }), [hasUsdBrl])
  const formatMoney = (amount: number) => fmt.format(amount)
  const currentCostDisplay = toDisplayCurrency(summary?.spentCost)
  const estimatedCostDisplay = toDisplayCurrency(summary?.estimatedTotalCost)

  const statusIcon = (s: Job['status']) => {
    if (s === 'READY') return <span className="text-success"><FontAwesomeIcon icon={faCheck} title="Pronto" /></span>
    if (s === 'ERROR') return <span className="text-danger"><FontAwesomeIcon icon={faTriangleExclamation} title="Erro" /></span>
    if (s === 'RUNNING') return <span className="text-info"><FontAwesomeIcon icon={faSpinner} spin title="Em Progresso" /></span>
    return <span className="text-secondary"><FontAwesomeIcon icon={faClock} title="Aguardando" /></span>
  }

  const onClick = (kind: string, row: Job) => {
    switch (kind) {
      case 'play':
        if (row.status === 'PENDING')
          doStep(row.id)
        break
      case 'retry':
        if (row.status === 'READY' || row.status === 'ERROR')
          onRetry(row.id, row.dossier_code)
        break
      case 'stop':
        if (row.status === 'RUNNING')
          onStop(row.id, row.dossier_code)
        break
      default:
        console.log('Unknown click action', kind, row)
    }
  }

  const mappedJobs = jobs.filter(j => statusFilter === 'all' || j.status === statusFilter).map(j => ({ ...j, status_icon: statusIcon(j.status), cost: j.cost_sum != null ? formatMoney(toDisplayCurrency(j.cost_sum as any)) : '' }))

  return (
    <Container className="mt-3">
      <div className="d-flex align-items-center mb-3">
        <div className="me-auto">
          <h1 className="mb-1">{summary?.name || 'Relatório'}</h1>
          <div className="text-muted small">
            {summary?.tipo_de_sintese ? `Tipo: ${TipoDeSinteseMap[summary.tipo_de_sintese]?.nome || summary.tipo_de_sintese}` : ''}
            {promptName ? `Prompt: ${promptName}` : ''}
            {summary?.tipo_de_sintese || promptName ? ' • ' : ''}
            {`Completo: ${summary?.complete ? 'Sim' : 'Não'}`}
          </div>
        </div>
        {playLoopRef.current && (
          <Button variant="link" className="me-2" disabled><FontAwesomeIcon icon={faSpinner} spin className="me-2" /></Button>
        )}
        {pending > 0 && (
          summary?.paused ? (
            <Button onClick={startPlay}><FontAwesomeIcon icon={faPlay} className="me-2" />Play</Button>
          ) : (
            <Button variant="secondary" onClick={pause}><FontAwesomeIcon icon={faPause} className="me-2" />Pause</Button>
          )
        )}
        {summary?.name && ready > 0 && (
          <a className="btn btn-outline-secondary ms-2" href={`/api/v1/batch/${id}/html`} target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faEye} className="me-2" />Visualizar Relatório
          </a>
        )}
        {error > 0 && (
          <a className="btn btn-outline-success ms-2" href={`/api/v1/batch/${id}/errors/csv`} target="_blank"><FontAwesomeIcon icon={faFileArrowDown} className="me-2" />Erros CSV</a>
        )}
      </div>

      {err && <Alert variant="danger" onClose={() => setErr('')} dismissible>{err}</Alert>}
      {info && <Alert variant="success" onClose={() => setInfo('')} dismissible>{info}</Alert>}

      <div className="mb-3">
        <div className="my-2">
          <ProgressBar>
            {ready > 0 && <ProgressBar now={pct(ready)} variant="success" key="ready" label={`${pct(ready)}%`} />}
            {error > 0 && <ProgressBar now={pct(error)} variant="danger" key="error" label={`${pct(error)}%`} />}
            {running > 0 && <ProgressBar now={pct(running)} variant="info" key="running" label={`${pct(running)}%`} />}
            {pending > 0 && <ProgressBar now={pct(pending)} variant="secondary" key="pending" label={`${pct(pending)}%`} />}
          </ProgressBar>
        </div>
        <div>
          {pending === 0 ? (
            <>
              Custo Total: {formatMoney(estimatedCostDisplay || currentCostDisplay)}
            </>
          ) : (
            <>
              Custo Atual: {formatMoney(currentCostDisplay)} |
              {' '}Custo Total Estimado: {formatMoney(estimatedCostDisplay)}
            </>
          )}
        </div>
      </div>
      <div className="d-flex align-items-center mb-0">
        <Nav variant="tabs" activeKey={statusFilter} onSelect={(k) => setStatusFilter((k as any) || 'all')} className="mb-0 flex-grow-1">
          <Nav.Item>
            <Nav.Link eventKey="all">Todos ({total})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="PENDING">Aguardando ({pending})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="RUNNING">Em Progresso ({running})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="READY">Prontos ({ready})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="ERROR">Erros ({error})</Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      <TableRecords records={mappedJobs} onClick={onClick} spec="Batch" options={{ batchId: id }} pageSize={10} >
        <div className="col col-auto mb-0">
          <Button variant="outline-primary" onClick={() => fixIndex()} className="me-2"><FontAwesomeIcon icon={faList} className="me-2" />Otimizar Índice</Button>
          <Button variant="outline-info" className="me-2" onClick={() => setShowAdd(true)}><FontAwesomeIcon icon={faPlus} className="me-2" />Adicionar</Button>
          <Button variant="outline-danger" onClick={() => setShowDelete(true)}><FontAwesomeIcon icon={faTrash} className="me-2" />Excluir</Button>
        </div></TableRecords>

      <CsvNumbersModal show={showAdd} title="Adicionar processos" onClose={() => setShowAdd(false)} onConfirm={onAddNumbers} />
      <CsvNumbersModal show={showDelete} title="Excluir processos" onClose={() => setShowDelete(false)} onConfirm={onDeleteNumbers} />
    </Container>

  )
}
