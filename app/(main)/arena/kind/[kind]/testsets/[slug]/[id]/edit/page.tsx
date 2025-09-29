import { Container } from 'react-bootstrap'
import TestsetForm from '../../../testset-form'
import { Dao } from '@/lib/db/mysql'

export default async function New(props: { params: Promise<{ kind: string, slug: string, id: number }> }) {
    const params = await props.params;
    const { kind, slug, id } = params

    const record = await Dao.retrieveTestsetById(id)
    if (!record) throw new PublicError('Prompt não encontrado')
    const models = await Dao.retrieveModels()
    const testsets = await Dao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    record.base_testset_id = record.id
    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Edição de Coleção de Testes</h1>
        <TestsetForm record={record} models={models} testsets={testsets} />
    </Container>)
}