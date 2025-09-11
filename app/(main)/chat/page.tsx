'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Container, Spinner } from 'react-bootstrap'
import Chat from '@/components/slots/chat'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { faFileLines, faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { faSackDollar, faUsers, faGavel } from '@fortawesome/free-solid-svg-icons'

export default async function Home() {
    noStore()

    const definition = getInternalPrompt('chat-standalone')
    const data: PromptDataType = {
        textos: []
    }

    return (
        <Suspense fallback={
            <Container className="mt-3" fluid={false}>
                <div className="text-center"><Spinner variant='secondary' /></div>
            </Container>
        }>
            <Container className="mt-3" fluid={false}>
                <Chat definition={definition} data={data} withTools={true} key={1}
                    footer={<div className="text-body-tertiary">O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.</div>}
                />
            </Container>
        </Suspense>
    )
}