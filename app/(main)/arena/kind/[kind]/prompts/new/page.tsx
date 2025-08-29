import { Container } from 'react-bootstrap'
import PromptForm from '../prompt-form'
import { Dao } from '@/lib/db/mysql'

export default async function New(props: { params: Promise<{ kind: string }> }) {
    const params = await props.params;
    const { kind } = params

    const models = await Dao.retrieveModels()
    const testsets = await Dao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Novo Prompt</h1>
        <PromptForm record={{ kind, content: {} }} models={models} testsets={testsets} />
    </Container>)
}