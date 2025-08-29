import { Container } from 'react-bootstrap'
import HeadNotePage from './HeadNotePage'
import { assertModel } from '@/lib/ai/model-server'

export default async function Revison() {
    await assertModel()

    return (<Container fluid={false}>
        <HeadNotePage />
    </Container>)
}