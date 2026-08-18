'use server'

import { NextRequest, NextResponse } from 'next/server'
import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import { UserDao } from '@/lib/db/dao'

/**
 * POST /api/v1/library/[id]/favorite
 * Adiciona o documento da biblioteca aos favoritos do usuário (id = uuid do documento)
 *
 * Exemplo de resposta:
 * { "success": true, "message": "Documento adicionado aos favoritos" }
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await assertCurrentUser()
    const params = await props.params
    const uuid = params.id

    if (!uuid) {
      return NextResponse.json(
        { error: 'Identificador do documento inválido' },
        { status: 400 }
      )
    }

    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    await LibraryDao.setFavorite(uuid, userId)

    return NextResponse.json({
      success: true,
      message: 'Documento adicionado aos favoritos'
    })
  } catch (error: any) {
    console.error('Error adding library document to favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar aos favoritos' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/library/[id]/favorite
 * Remove o documento da biblioteca dos favoritos do usuário (id = uuid do documento)
 *
 * Exemplo de resposta:
 * { "success": true, "message": "Documento removido dos favoritos" }
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await assertCurrentUser()
    const params = await props.params
    const uuid = params.id

    if (!uuid) {
      return NextResponse.json(
        { error: 'Identificador do documento inválido' },
        { status: 400 }
      )
    }

    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    await LibraryDao.resetFavorite(uuid, userId)

    return NextResponse.json({
      success: true,
      message: 'Documento removido dos favoritos'
    })
  } catch (error: any) {
    console.error('Error removing library document from favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover dos favoritos' },
      { status: 500 }
    )
  }
}
