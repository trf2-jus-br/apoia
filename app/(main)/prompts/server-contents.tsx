'use server'

import { getSelectedModelParams } from '@/lib/ai/model-server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser, isUserCorporativo, isUserModerator, UserType } from '@/lib/user'
import { Contents } from './contents'
import { Container } from 'react-bootstrap'
import { cookies } from 'next/headers'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { IAPromptList } from '@/lib/db/mysql-types'
import { fixPromptList } from '@/lib/prompt-list'

export default async function ServerContents() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    if (!(await isUserCorporativo(user)))
        return <Container><div className="alert alert-danger mt-5">Usuário não é corporativo</div></Container>

    const { model, apiKey } = await getSelectedModelParams()

    const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name)
    // Ensure internal synthesis prompts are available in the bank (one-time upsert)
    const basePrompts = await Dao.retrieveLatestPrompts(user_id, await isUserModerator(user))

    const prompts = await fixPromptList(basePrompts)

    return <Contents prompts={prompts} user={user} user_id={user_id} apiKeyProvided={!!apiKey} model={model} isModerator={isModerator} />
}

