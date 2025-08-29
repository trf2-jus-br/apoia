import { Container } from 'react-bootstrap'
import AbusiveLitigationPage from './AbusiveLitigationPage'
import { getSelectedModelName } from '@/lib/ai/model-server'
import { envString } from '@/lib/utils/env'

export default async function Revison() {
    // await assertModel()
    const isApiKey = !!(await getSelectedModelName())

    return (<Container fluid={false}>
        <AbusiveLitigationPage NAVIGATE_TO_PROCESS_URL={envString('NAVIGATE_TO_PROCESS_URL')} hasApiKey={isApiKey} />
    </Container>)
}