import { Container } from 'react-bootstrap'
import Link from 'next/link'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons'
import { fetchDollar } from './[id]/page'
import { Dao } from '@/lib/db/mysql'
import { getSelectedModelParams } from '@/lib/ai/model-server'
import ApiKeyMissing from '@/components/api-key-missing'
import { faBook, faKey } from '@fortawesome/free-solid-svg-icons'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function BatchesPage() {
  const usdBrl = await fetchDollar()
  const rows = await Dao.listBatchesForUser()
  const { apiKeyFromEnv } = await getSelectedModelParams()

  if (apiKeyFromEnv)
    return (<Container className="mt-5">
      <div className="alert alert-info text-center mb-4" role="alert">
        Relatórios de acervo consomem muitos tokens e podem incorrer em custos elevados.
        <br />
        A chave de API fornecida pela administração tem limites de uso que podem ser rapidamente atingidos.
        <br />
        Para gerar esses relatórios, você precisa cadastrar sua própria chave de API.{' '}
        <Link href="/prefs" className="alert-link">Cadastre-a aqui</Link>.
        <FontAwesomeIcon icon={faKey} className="ms-2" />
        <br />
        Não sabe o que é uma chave de API ou como usá-la? Consulte o{' '}
        <Link
          href="https://trf2.gitbook.io/apoia/relatorio-de-acervo"
          className="alert-link"
        >Manual da Apoia</Link>.
        <FontAwesomeIcon icon={faBook} className="ms-2" />
      </div>
    </Container>)

  return (
    <Container className="mt-3">
      <div className="d-flex align-items-center mb-3">
        <h1 className="me-auto">Relatórios de Acervo</h1>
        <Link className="btn btn-primary" href="/batch/new">Novo relatório</Link>
      </div>
      <div className="alert alert-info">
        Relatórios de acervo consomem muitos tokens e podem incorrer em <strong>custos elevados</strong>. Antes de gerar um relatório, consulte o{' '}
        <Link
          href="https://trf2.gitbook.io/apoia/relatorio-de-acervo"
          className="alert-link"
        >Manual da Apoia</Link>.
        <FontAwesomeIcon icon={faBook} className="ms-2" />
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
