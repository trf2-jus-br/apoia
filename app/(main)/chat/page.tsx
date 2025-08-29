'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Container, Spinner } from 'react-bootstrap'
import Chat, { SuggestionType } from '@/components/slots/chat'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { faFileLines, faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { faSackDollar, faUsers } from '@fortawesome/free-solid-svg-icons'

export default async function Home() {
    noStore()

    const definition = getInternalPrompt('chat-standalone')
    const data: PromptDataType = {
        textos: []
    }

    const suggestions: SuggestionType[] = [
        { suggestion: 'Resuma o processo em um parágrafo.', icon: faFileLines, label: 'Resumir o processo' },
        { suggestion: 'Liste as partes e seus advogados.', icon: faUsers, label: 'Listar as partes' },
        { suggestion: 'Qual o valor da causa?', icon: faSackDollar, label: 'Valor da causa' },
        { suggestion: 'Quais são os pontos ainda controvertidos?', icon: faQuestionCircle, label: 'Pontos controvertidos' },
        { suggestion: 'Quais são os principais argumentos das partes?', icon: faFileLines, label: 'Argumentos das partes' },
        // { suggestion: 'Pesquise e liste os principais precedentes relevantes para a controvérsia, apresentando cada um em um único parágrafo, com número do processo, tribunal, órgão julgador, relator, data do julgamento e, em seguida, a justificativa de por que o precedente se aplica ao caso, sem incluir a ementa.', icon: faFileLines, label: 'Precedentes relacionados' }
    ]

    return (
        <Suspense fallback={
            <Container className="mt-3" fluid={false}>
                <div className="text-center"><Spinner variant='secondary' /></div>
            </Container>
        }>
            <Container className="mt-3" fluid={false}>
                <Chat definition={definition} data={data} suggestions={suggestions} withTools={true} key={1}
                    footer={<div className="text-body-tertiary">O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.</div>}
                />
            </Container>
        </Suspense>
    )
}