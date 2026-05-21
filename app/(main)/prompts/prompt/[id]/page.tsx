'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { PromptDao } from '@/lib/db/dao'
import { Container, Spinner } from 'react-bootstrap'
import PromptInfoContents from './prompt-info-contents'
import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { getPromptDefinition, getPromptDefinitionByUuid, getFirstProductSlug } from '@/lib/ai/prompt-store'
import { slugify } from '@/lib/utils/utils'

export default async function Home(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)

    const idStr = params.id
    const isNum = !isNaN(Number(idStr))
    let prompt = isNum
        ? await PromptDao.retrieveLatestPromptByBaseId(Number(idStr))
        : await PromptDao.retrieveLatestPromptByUuid(idStr)

    if (prompt?.origin) {
        let def = null
        let name = prompt.name

        // Use workflow successors from DB (origin-synced aggregator)
        if (prompt.content?.workflow?.successors?.length) {
            for (const step of prompt.content.workflow.successors) {
                const candidate = await getPromptDefinitionByUuid(step.uuid).catch(() => null)
                if (!candidate) continue
                if (candidate.kind === 'chat' || candidate.kind === 'chat-standalone') continue
                def = candidate
                break
            }
        }

        if (def) {
            // Convert PromptDefinitionType to IAPrompt content structure
            prompt = {
                id: 0,
                base_id: 0,
                uuid: '',
                created_by: user.id,
                model_id: null,
                testset_id: null,
                is_latest: 1,
                created_at: null,
                category: null,
                name: name,
                slug: slugify(def.kind),
                content: {
                    system_prompt: def.systemPrompt ?? null,
                    prompt: def.prompt ?? null,
                    json_schema: def.jsonSchema ?? null,
                    format: def.format ?? null,
                    template: def.template ?? null,
                }
            }
        }
    }

    return (
        <Container className="mt-5" fluid={false}>
            <h1 className="text-center">Informações de Prompt</h1>
            <Suspense fallback={
                <div className="text-center"><Spinner variant='secondary' /></div>
            }>
                <PromptInfoContents prompt={prompt} isModerator={isModerator} />
            </Suspense>
        </Container>
    )
}