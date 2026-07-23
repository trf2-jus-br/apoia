import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Container, Spinner } from 'react-bootstrap'
import Chat from '@/components/slots/chat'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { faFileLines, faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { faSackDollar, faUsers, faGavel } from '@fortawesome/free-solid-svg-icons'
import { assertCurrentUser, isUserCorporativo } from '@/lib/user'
import { getMode } from '@/lib/utils/prefs'
import Print from '@/components/slots/print'
import { formatDateTime, formatYYYYMMDDHHMMSS } from '@/lib/utils/date'
import { slugify } from '@/lib/utils/utils'
import { assertModel, getSelectedModelName } from '@/lib/ai/model-server'

export const metadata = { title: 'Chat' }

export default async function Home({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
    noStore()
    // const [processNumber, setProcessNumber] = useState<string | null>(null)

    const { prompt: promptSlug } = await searchParams
    const user = await assertCurrentUser()
    if (!(await isUserCorporativo(user)))
        return <Container><div className="alert alert-danger mt-5">Usuário não é corporativo</div></Container>

    await assertModel()
    const model = await getSelectedModelName()
    const mode = await getMode()

    // Sem prompt na URL: default depende do modo (administrativo usa chat-administrativo).
    const definition = await getPromptDefinition(promptSlug ?? (mode === 'ADMINISTRATIVO' ? 'chat-administrativo' : 'chat-standalone'))
    const data: PromptDataType = {
        textos: []
    }

    return (
        <Suspense fallback={
            <Container className="mt-3" fluid={false}>
                <div className="text-center"><Spinner variant='secondary' /></div>
            </Container>
        }>
            <Container id="printDiv" className="mt-3" fluid={false}>
                <Chat definition={definition} data={data} model={model} withTools={true}
                    footer={promptSlug !== 'chat-administrativo' && (
                        <div key="footer" className="text-body-tertiary h-print">O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.</div>
                    )}
                />
                <Print numeroDoProcesso={`chat-${slugify(formatYYYYMMDDHHMMSS(new Date()))}`} />
            </Container>
        </Suspense>
    )
}