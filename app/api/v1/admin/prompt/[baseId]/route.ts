'use server'

import { NextResponse } from 'next/server'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'

async function GET_HANDLER(req: Request, { params }: { params: Promise<{ baseId: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { baseId } = await params
    const base_id = Number(baseId)

    if (!base_id || isNaN(base_id)) {
        throw new ApiError('base_id inválido', 400)
    }

    if (!knex) {
        throw new ApiError('Banco de dados não disponível', 500)
    }

    // Buscar todas as versões do prompt
    const versions = await knex('ia_prompt')
        .select('id', 'base_id', 'name', 'slug', 'created_at', 'created_by', 'is_latest', 'share', 'kind')
        .where({ base_id })
        .orderBy('created_at', 'desc')

    if (!versions || versions.length === 0) {
        throw new ApiError('Prompt não encontrado', 404)
    }

    // Buscar informações do usuário atual (owner)
    const latestVersion = versions.find(v => v.is_latest === 1) || versions[0]
    let owner = null
    if (latestVersion.created_by) {
        owner = await knex('ia_user')
            .select('id', 'username', 'name', 'cpf')
            .where({ id: latestVersion.created_by })
            .first()
    }

    return NextResponse.json({
        base_id,
        versions,
        owner,
        latest: latestVersion
    })
}

export const GET = withErrorHandler(GET_HANDLER as any)
