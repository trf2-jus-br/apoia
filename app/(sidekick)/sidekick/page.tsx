import { unstable_noStore as noStore } from 'next/cache'
import { Container } from 'react-bootstrap'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { PromptDataType } from '@/lib/ai/prompt-types'
import { assertCurrentUser, isUserCorporativo } from '@/lib/user'
import { assertModel, getSelectedModelName } from '@/lib/ai/model-server'
import ServerContents from '@/app/(main)/prompts/server-contents'

export default async function Home({ searchParams }) {
    noStore()
    const sp = await searchParams
    const numeroDoProcesso = typeof sp.process === 'string' ? sp.process.trim() : undefined

    const prompt = typeof sp.prompt === 'string' ? sp.prompt.trim() : undefined
    // if (!prompt && !numeroDoProcesso) {
    //     redirect('?prompt=chat-standalone')
    // }

    const user = await assertCurrentUser()
    if (!(await isUserCorporativo(user)))
        return <Container><div className="alert alert-danger mt-5">Usuário não é corporativo</div></Container>

    await assertModel()
    const model = await getSelectedModelName()

    const definition = await getPromptDefinition('chat-standalone')
    const data: PromptDataType = {
        textos: []
    }

    return <div className="mb-3">
        <ServerContents sidekick />
    </div>

    // prompt === 'chat-standalone'
    //     ? <Chat definition={definition} data={data} model={model} withTools={true} key={1}
    //         footer={<div className="text-body-tertiary h-print">O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.</div>}
    //         sidekick
    //     />
    //     : 
}