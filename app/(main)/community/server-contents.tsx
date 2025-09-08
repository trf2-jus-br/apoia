'use server'

import { getSelectedModelParams } from '@/lib/ai/model-server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser, isUserCorporativo, isUserModerator, UserType } from '@/lib/user'
import { Contents } from './contents'
import { Container } from 'react-bootstrap'

const parseIntSafe = (s: any): number => {
    const n = parseInt(s)
    if (isNaN(n)) return 0
    return n
}

export default async function ServerContents() {
    const user = await assertCurrentUser()
    if (!(await isUserCorporativo(user)))
        return <Container><div className="alert alert-danger mt-5">Usuário não é corporativo</div></Container>

    const { model, apiKey } = await getSelectedModelParams()

    const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name)
    const prompts = await Dao.retrieveLatestPrompts(user_id, await isUserModerator(user))
    prompts.sort((a, b) => {
        if (!!a.is_favorite > !!b.is_favorite) return -1
        if (!!a.is_favorite < !!b.is_favorite) return 1
        if (a.is_mine > b.is_mine) return -1
        if (a.is_mine < b.is_mine) return 1
        if (parseIntSafe(a.favorite_count) > parseIntSafe(b.favorite_count)) return -1
        if (parseIntSafe(a.favorite_count) < parseIntSafe(b.favorite_count)) return 1
        if (a.created_at > b.created_at) return -1
        if (a.created_at < b.created_at) return 1
        return 0
    })

    return <Contents prompts={prompts} user={user} user_id={user_id} apiKeyProvided={!!apiKey} model={model} />
}

