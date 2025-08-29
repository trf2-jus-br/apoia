import { unstable_noStore as noStore } from 'next/cache'
import { Container } from 'react-bootstrap'
import BatchForm from './batch-form'

export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

export default async function ShowProcess({ params }) {
    noStore()

    return (
        <Container fluid={false}>
            <h1 className="text-center mt-3">Processamento em Lote</h1>
            <BatchForm />
        </Container>
    )
}