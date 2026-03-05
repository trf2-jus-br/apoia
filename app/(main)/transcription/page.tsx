import { Container } from 'react-bootstrap'
import { assertModel, getSelectedModelName, getSelectedModelParams } from '@/lib/ai/model-server'
import TranscriptionPage from './TranscriptionPage'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook, faKey } from '@fortawesome/free-solid-svg-icons'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export default async function Transcription() {
    await assertModel()
    const model = await getSelectedModelName()
    const degravacaoDefinition = await getPromptDefinition('degravacao')
    const chatDefinition = await getPromptDefinition('chat')

    return (<Container fluid={false}>
        <TranscriptionPage model={model} degravacaoDefinition={degravacaoDefinition} chatDefinition={chatDefinition} />
    </Container>)
}