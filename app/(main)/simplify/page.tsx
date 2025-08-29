import { Container } from 'react-bootstrap'
import SimplifyPage from './SimplifyPage'
import { assertModel } from '@/lib/ai/model-server'

export default async function Revison() {
    await assertModel()
    
    return (<Container fluid={false}>
        <SimplifyPage />
    </Container>)
}