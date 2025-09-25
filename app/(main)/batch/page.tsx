import { Container } from 'react-bootstrap'
import Fetcher from '@/lib/utils/fetcher'
import Link from 'next/link'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons'
import { fetchDollar } from './[id]/page'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function getData() {
  const res = await Fetcher.get<any>('/api/v1/batch')
  return res?.rows || []
}

export default async function BatchesPage() {
  const usdBrl = await fetchDollar()

  const rows = await getData()
  return (
    <Container className="mt-3">
      <div className="d-flex align-items-center mb-3">
        <h1 className="me-auto">Relatórios</h1>
        <Link className="btn btn-primary" href="/batch/new">Novo relatório</Link>
      </div>
      <table className="table table-striped">
        <thead className="table-dark">
          <tr>
            <th>Nome</th>
            <th>Tipo/Prompt</th>
            <th>Completo</th>
            <th>Status</th>
            <th>Aguardando</th>
            <th>Pronto</th>
            <th>Erro</th>
            <th>Total</th>
            <th style={{ textAlign: 'end' }}>Custo (R$)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id}>
              <td>
                <Link className="" href={`/batch/${r.id}`}>{r.name || <FontAwesomeIcon icon={faPenToSquare} />}</Link>
              </td>
              <td>{TipoDeSinteseMap[r.tipo_de_sintese]?.nome || r.tipo_de_sintese || `[Favorito] ${r.prompt_latest_name}`}</td>
              <td>{r.complete ? 'Sim' : 'Não'}</td>
              <td>{r.paused ? 'Pausado' : 'Em execução'}</td>
              <td>{r.totals.error}</td>
              <td>{r.totals.ready}</td>
              <td>{r.totals.error}</td>
              <td>{r.totals.total}</td>
              <td style={{ textAlign: 'end' }}>{(usdBrl * r.spentCost)?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  )
}
