'use server'

import { getSelectedModelParams } from '@/lib/ai/model-server'
import { UserDao, PromptDao, RatingDao } from '@/lib/db/dao'
import { assertCurrentUser, isUserCorporativo, isUserModerator, UserType } from '@/lib/user'
import { Contents } from './contents'
import { Container } from 'react-bootstrap'
import { cookies } from 'next/headers'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { IAPromptList } from '@/lib/db/mysql-types'
import { fixPromptList } from '@/lib/prompt-list'
import { nivelDeSigiloPermitido } from '@/lib/proc/sigilo'
import { isBetaTester, getMode } from '@/lib/utils/prefs'

export default async function ServerContents( params: { sidekick?: boolean } ) {
    const MINIMUM_NUMBER_OF_VOTES_TO_TURN_UNLISTED = 5
    const MAX_RATING_AVG_LAPLACE_TO_TURN_UNLISTED = 2.5

    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    if (!(await isUserCorporativo(user)))
        return <Container><div className="alert alert-danger mt-5">Usuário não é corporativo</div></Container>

    const { model, apiKey } = await getSelectedModelParams()

    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)
    // Ensure internal synthesis prompts are available in the bank (one-time upsert)
    const mode = await getMode()
    const basePrompts = await PromptDao.retrieveLatestPrompts(user_id, await isUserModerator(user), mode)

    const prompts = await fixPromptList(basePrompts, params.sidekick ?? false )

    // Carrega todos os ratings e agrega aos prompts
    const ratingsStats = await RatingDao.getAllPromptRatingStats()
    const ratingsMap = new Map(ratingsStats.map(stat => [stat.prompt_base_id, stat]))

    // Adiciona informação de rating a cada prompt
    const promptsWithRatings = prompts.map(prompt => ({
        ...prompt,
        rating: ratingsMap.get(prompt.base_id || prompt.id) || null
    }))

    const maxConfidentialityLevel = nivelDeSigiloPermitido(user)
    const betaTester = await isBetaTester()

    // Caso o prompt tenha share=PUBLICO e o rating tenha mais de 5 votos e a avg_laplace < 2, 
    // troca o share para NAO_LISTADO para evitar exposição de prompts mal avaliados
    for (const prompt of promptsWithRatings) {
        if (prompt.share === 'PUBLICO' && prompt.rating) {
            if (prompt.rating.voter_count >= MINIMUM_NUMBER_OF_VOTES_TO_TURN_UNLISTED && prompt.rating.avg_laplace < MAX_RATING_AVG_LAPLACE_TO_TURN_UNLISTED) {
                prompt.share = 'NAO_LISTADO'
                await PromptDao.setUnlisted(prompt.id)
            }
        }
    }

    return <Contents prompts={promptsWithRatings} user={user} user_id={user_id} apiKeyProvided={!!apiKey} model={model} isModerator={isModerator} maxConfidentialityLevel={maxConfidentialityLevel} sidekick={params.sidekick} isBetaTester={betaTester} />
}
