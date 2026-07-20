'use server'

import { NextResponse } from 'next/server'
import { TicketDao, UserDao } from '@/lib/db/dao'
import { assertApiUser } from '@/lib/user'
import { withErrorHandler } from '@/lib/utils/api-error'
import { IATicketKind } from '@/lib/db/mysql-types'

const KINDS: IATicketKind[] = ['ERRO', 'DUVIDA', 'SUGESTAO']

async function GET_HANDLER() {
    const user = await assertApiUser()
    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)
    const items = await TicketDao.listTicketsByUser(userId)
    return NextResponse.json({ items })
}

async function POST_HANDLER(req: Request) {
    const user = await assertApiUser()
    const form = await req.formData()
    const kindRaw = String(form.get('kind') || 'ERRO') as IATicketKind
    const kind = KINDS.includes(kindRaw) ? kindRaw : 'ERRO'
    const message = String(form.get('message') || '').trim()
    if (!message) {
        return NextResponse.json({ errormsg: 'A descrição do problema é obrigatória' }, { status: 400 })
    }
    const errorContext = form.get('error_context') ? String(form.get('error_context')) : null
    const pageUrl = form.get('page_url') ? String(form.get('page_url')).slice(0, 512) : null
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null

    let screenshot: Buffer | null = null
    let screenshotContentType: string | null = null
    const file = form.get('screenshot') as File | null
    if (file && file.size > 0) {
        const bytes = await file.arrayBuffer()
        if (bytes.byteLength > 5 * 1024 * 1024) {
            return NextResponse.json({ errormsg: 'Captura de tela maior que 5MB' }, { status: 400 })
        }
        screenshot = Buffer.from(bytes)
        screenshotContentType = file.type || 'image/jpeg'
    }

    const uuid = await TicketDao.createTicket(user, {
        kind,
        message,
        error_context: errorContext,
        page_url: pageUrl,
        user_agent: userAgent,
        screenshot,
        screenshot_content_type: screenshotContentType,
    })
    return NextResponse.json({ uuid })
}

export const GET = withErrorHandler(GET_HANDLER as any)
export const POST = withErrorHandler(POST_HANDLER as any)
