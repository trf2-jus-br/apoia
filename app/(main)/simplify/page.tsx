import { Container } from 'react-bootstrap'
import SimplifyPage from './SimplifyPage'
import { assertModel } from '@/lib/ai/model-server'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export default async function Revison() {
    await assertModel()
    const definition = await getPromptDefinition('linguagem-simples')
    
    return (<Container fluid={false}>
        <SimplifyPage definition={definition} />
    </Container>)
}