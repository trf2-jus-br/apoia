import { unstable_noStore as noStore } from 'next/cache'
import ProcessServerContents from './process-server-contents'
import Fetcher from '@/lib/utils/fetcher'
import { Suspense } from 'react'
import { Container } from 'react-bootstrap'
import ProcessTitle from '@/components/slots/process-title'

export const maxDuration = 60 // seconds

export default async function ShowProcess(props) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const kind = searchParams?.kind
    const pieces = searchParams?.pieces
    const ready = searchParams?.ready === 'true'
    // await assertCurrentUser()
    const id: string = (params?.id?.toString() || '').replace(/[^0-9]/g, '') as string

    try {
        noStore()

        const loading = () => {
            return <div className="spinner-border text-secondary opacity-50 text-center mt-4" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        }

        return (
            <div id="printDiv">
                <ProcessTitle id={id} />
                <Container fluid={false}>
                    <Suspense fallback={loading()}><ProcessServerContents id={id} kind={kind} pieces={pieces} ready={ready} /></Suspense>
                </Container>
            </div>)
    } catch (error) {
        const message = Fetcher.processError(error)
        return (<div className='alert alert-danger mt-5'>Erro ao buscar dados do processo: {message}</div>)
    }
}