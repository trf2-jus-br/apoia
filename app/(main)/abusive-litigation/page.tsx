import { Container } from 'react-bootstrap'
import AbusiveLitigationPage from './AbusiveLitigationPage'
import { getSelectedModelName } from '@/lib/ai/model-server'
import { envString } from '@/lib/utils/env'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export default async function Revison() {
    // await assertModel()
    const model = await getSelectedModelName()
    const isApiKey = !!model
    const litiganciaDefinition = await getPromptDefinition('litigancia-predatoria')
    const chatDefinition = await getPromptDefinition('chat')

    return (<Container fluid={false}>
        <AbusiveLitigationPage NAVIGATE_TO_PROCESS_URL={envString('NAVIGATE_TO_PROCESS_URL')} hasApiKey={isApiKey} model={model} litiganciaDefinition={litiganciaDefinition} chatDefinition={chatDefinition} />
    </Container>)
}