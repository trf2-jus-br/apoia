'use server'

import { NextResponse } from 'next/server'
import { GenerationDao } from '@/lib/db/dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import { EvaluationStatsParams } from '@/lib/db/mysql-types'

async function GET_HANDLER(req: Request) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { searchParams } = new URL(req.url)
    const params: EvaluationStatsParams = {
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        model: searchParams.get('model') || undefined,
        prompt: searchParams.get('prompt') || undefined,
    }

    const stats = await GenerationDao.retrieveEvaluationStats(params)
    return NextResponse.json(stats)
}

export const GET = withErrorHandler(GET_HANDLER as any)
