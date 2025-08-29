import { Container } from 'react-bootstrap'
import ReviewPage from './ReviewPage'
import { assertModel } from '@/lib/ai/model-server'

export default async function Revison() {
    await assertModel()
    
    return (<Container fluid={false}>
        <ReviewPage />
    </Container>)
}