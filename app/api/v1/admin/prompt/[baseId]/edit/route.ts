'use server'

import { NextResponse } from 'next/server'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'
import { slugify } from '@/lib/utils/utils'

async function PUT_HANDLER(req: Request, { params }: { params: Promise<{ baseId: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { baseId } = await params
    const base_id = Number(baseId)

    if (!base_id || isNaN(base_id)) {
        throw new ApiError('base_id invalido', 400)
    }

    const body = await req.json()
    const { kind, name, slug } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ApiError('name e obrigatorio', 400)
    }

    if (!knex) {
        throw new ApiError('Banco de dados nao disponivel', 500)
    }

    // Verificar se o prompt existe
    const prompt = await knex('ia_prompt')
        .select('id')
        .where({ base_id })
        .first()

    if (!prompt) {
        throw new ApiError('Prompt nao encontrado', 404)
    }

    // Montar os campos para atualizar
    const updateData: Record<string, any> = {
        name: name.trim(),
        slug: slug && typeof slug === 'string' && slug.trim() ? slug.trim() : slugify(name.trim()),
    }

    // kind pode ser null ou string
    if (kind !== undefined) {
        updateData.kind = kind === '' ? null : kind
    }

    // Atualizar todas as versoes com o mesmo base_id
    const updated = await knex('ia_prompt')
        .where({ base_id })
        .update(updateData)

    return NextResponse.json({
        success: true,
        updated,
        base_id,
        ...updateData
    })
}

export const PUT = withErrorHandler(PUT_HANDLER as any)
