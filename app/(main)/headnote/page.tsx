import { Container } from 'react-bootstrap'
import HeadNotePage from './HeadNotePage'
import { assertModel } from '@/lib/ai/model-server'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export default async function Revison() {
    await assertModel()
    const definition = await getPromptDefinition('ementa')

    return (<Container fluid={false}>
        <HeadNotePage definition={definition} />
    </Container>)
}