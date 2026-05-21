'use server'

import { NextRequest, NextResponse } from 'next/server'
import { PromptDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import { UserDao } from '@/lib/db/dao'

/**
 * POST /api/v1/prompt/[base_id]/favorite
 * Adiciona o prompt aos favoritos do usuário
 * 
 * Exemplo de resposta:
 * { "success": true, "message": "Prompt adicionado aos favoritos" }
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ base_id: string }> }
) {
  try {
    const user = await assertCurrentUser()
    const params = await props.params
    const baseIdStr = params.base_id

    if (!baseIdStr) {
      return NextResponse.json(
        { error: 'Identificador do prompt inválido' },
        { status: 400 }
      )
    }

    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    await PromptDao.setFavoriteByUuid(baseIdStr, userId)

    return NextResponse.json({
      success: true,
      message: 'Prompt adicionado aos favoritos'
    })
  } catch (error: any) {
    console.error('Error adding prompt to favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar aos favoritos' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/prompt/[base_id]/favorite
 * Remove o prompt dos favoritos do usuário
 * 
 * Exemplo de resposta:
 * { "success": true, "message": "Prompt removido dos favoritos" }
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ base_id: string }> }
) {
  try {
    const user = await assertCurrentUser()
    const params = await props.params
    const baseIdStr = params.base_id

    if (!baseIdStr) {
      return NextResponse.json(
        { error: 'Identificador do prompt inválido' },
        { status: 400 }
      )
    }

    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    await PromptDao.resetFavoriteByUuid(baseIdStr, userId)

    return NextResponse.json({
      success: true,
      message: 'Prompt removido dos favoritos'
    })
  } catch (error: any) {
    console.error('Error removing prompt from favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover dos favoritos' },
      { status: 500 }
    )
  }
}
