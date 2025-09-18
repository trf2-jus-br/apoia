import { Container } from 'react-bootstrap'
import Fetcher from '@/lib/utils/fetcher'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function getData() {
  const res = await Fetcher.get('/api/v1/batch')
  return res?.rows || []
}

export default async function BatchesPage() {
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
            <th>Tipo</th>
            <th>Completo</th>
            <th>Status</th>
            <th>Aguardando</th>
            <th>Pronto</th>
            <th>Erro</th>
            <th>Total</th>
            {/* <th>Custo</th> */}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.tipo_de_sintese}</td>
              <td>{r.complete ? 'S' : 'N'}</td>
              <td>{r.paused ? 'Pausado' : 'Em execução'}</td>
              <td>{r.totals.error}</td>
              <td>{r.totals.ready}</td>
              <td>{r.totals.error}</td>
              <td>{r.totals.total}</td>
              {/* <td>R$ {r.spentCost?.toFixed(2)}</td> */}
              <td className="text-end">
                <Link className="" href={`/batch/${r.id}`}>Abrir painel</Link>
                {/* <a className="ms-2" href={`/api/v1/batch/${r.id}/errors/csv`} target="_blank">Erros CSV</a> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  )
}
