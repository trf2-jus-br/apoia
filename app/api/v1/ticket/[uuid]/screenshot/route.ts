'use server'

import { NextResponse } from 'next/server'
import { TicketDao, UserDao } from '@/lib/db/dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(req: Request, { params }: { params: Promise<{ uuid: string }> }) {
    const user = await assertApiUser()
    const { uuid } = await params
    const ticket = await TicketDao.getTicket(uuid)
    if (!ticket) {
        throw new ApiError('Chamado não encontrado', 404)
    }
    if (!await isUserModerator(user)) {
        const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)
        if (ticket.user_id !== userId) {
            throw new ApiError('Acesso negado', 403)
        }
    }
    const shot = await TicketDao.getScreenshot(uuid)
    if (!shot) {
        throw new ApiError('Chamado sem captura de tela', 404)
    }
    return new NextResponse(new Uint8Array(shot.buffer), {
        headers: {
            'Content-Type': shot.contentType,
            'Cache-Control': 'private, max-age=3600',
        }
    })
}

export const GET = withErrorHandler(GET_HANDLER as any)
