'use server'

import { NextResponse } from 'next/server'
import Cryptr from 'cryptr'
import { TicketDao } from '@/lib/db/dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import { envString } from '@/lib/utils/env'
import { IATicketStatus } from '@/lib/db/mysql-types'

const STATUSES: IATicketStatus[] = ['ABERTO', 'EM_ANALISE', 'RESOLVIDO']

async function GET_HANDLER(req: Request, { params }: { params: Promise<{ uuid: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { uuid } = await params
    const ticket = await TicketDao.getTicket(uuid)
    if (!ticket) {
        throw new ApiError('Chamado não encontrado', 404)
    }

    // error_context é gravado criptografado (Cryptr, mesmo padrão do ErrorSpan);
    // descriptografa server-side para exibição ao moderador
    let errorStack: string | null = null
    if (ticket.error_context) {
        try {
            const cryptr = new Cryptr(envString('PROPERTY_SECRET') as string, {})
            errorStack = cryptr.decrypt(ticket.error_context)
        } catch {
            errorStack = null
        }
    }

    const hasScreenshot = !!ticket.screenshot_content_type
    return NextResponse.json({ ...ticket, error_context: undefined, errorStack, hasScreenshot })
}

async function PATCH_HANDLER(req: Request, { params }: { params: Promise<{ uuid: string }> }) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { uuid } = await params
    const ticket = await TicketDao.getTicket(uuid)
    if (!ticket) {
        throw new ApiError('Chamado não encontrado', 404)
    }

    const body = await req.json()
    const status = body.status as IATicketStatus
    if (!STATUSES.includes(status)) {
        return NextResponse.json({ errormsg: 'status inválido' }, { status: 400 })
    }
    const response = typeof body.response === 'string' ? body.response.trim() : undefined

    await TicketDao.updateTicket(uuid, {
        status,
        response,
        responded_by: user.preferredUsername || user.name,
    })
    return NextResponse.json({ success: true })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const PATCH = withErrorHandler(PATCH_HANDLER as any)
