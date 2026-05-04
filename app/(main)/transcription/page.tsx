import { Container } from 'react-bootstrap'
import { assertModel, getSelectedModelParams } from '@/lib/ai/model-server'
import TranscriptionPage from './TranscriptionPage'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { checkModelSupportsAudioVideo } from '@/lib/ai/model-metadata-server'

export default async function Transcription() {
    await assertModel()
    const { model } = await getSelectedModelParams()
    const modelSupportsFiles = await checkModelSupportsAudioVideo(model)
    const degravacaoDefinition = await getPromptDefinition('degravacao')
    const chatDefinition = await getPromptDefinition('chat')

    return (<Container fluid={false}>
        <TranscriptionPage model={model} modelSupportsFiles={modelSupportsFiles} degravacaoDefinition={degravacaoDefinition} chatDefinition={chatDefinition} />
    </Container>)
}