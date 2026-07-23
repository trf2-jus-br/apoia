import { Container } from 'react-bootstrap'
import ReviewPage from './ReviewPage'
import { assertModel } from '@/lib/ai/model-server'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export const metadata = { title: 'Revisão de Texto' }

export default async function Revison() {
    await assertModel()
    const definition = await getPromptDefinition('revisao-de-texto')
    
    return (<Container fluid={false}>
        <ReviewPage definition={definition} />
    </Container>)
}