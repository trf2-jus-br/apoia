import { Container } from 'react-bootstrap'
import PromptForm from '../../../prompt-form'
import { Dao } from '@/lib/db/mysql'

export default async function New(props: { params: Promise<{ kind: string, slug: string, id: number }> }) {
    const params = await props.params;
    const { kind, slug, id } = params

    const record = await Dao.retrievePromptById(id)
    if (!record) throw new Error('Prompt not found')
    const models = await Dao.retrieveModels()
    const testsets = await Dao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    record.base_id = record.id
    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Edição de Prompt</h1>
        <PromptForm record={record} models={models} testsets={testsets} />
    </Container>)
}