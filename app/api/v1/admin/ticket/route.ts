'use server'

import { NextResponse } from 'next/server'
import { TicketDao, CourtDao } from '@/lib/db/dao'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, withErrorHandler } from '@/lib/utils/api-error'
import { IATicketStatus } from '@/lib/db/mysql-types'

const STATUSES: IATicketStatus[] = ['ABERTO', 'EM_ANALISE', 'RESOLVIDO']

async function GET_HANDLER(req: Request) {
    const user = await assertApiUser()
    const isModerator = await isUserModerator(user)
    if (!isModerator) {
        throw new ApiError('Acesso negado', 403)
    }

    const { searchParams } = new URL(req.url)
    const statusRaw = searchParams.get('status') as IATicketStatus | null
    const status = statusRaw && STATUSES.includes(statusRaw) ? statusRaw : undefined

    const [items, stats] = await Promise.all([
        TicketDao.listTickets(status),
        TicketDao.getTicketStats(),
    ])

    // Resolve nomes dos tribunais presentes na listagem e nas estatísticas (cache local apenas)
    const courtIds = new Set<number>()
    items.forEach(t => t.court_id != null && courtIds.add(t.court_id))
    stats.byCourt.forEach(c => c.court_id != null && courtIds.add(c.court_id))
    const courts: Record<number, string> = {}
    for (const courtId of courtIds) {
        const court = await CourtDao.getCourtById(courtId)
        if (court) courts[courtId] = court.sigla || court.nome
    }

    return NextResponse.json({ items, stats, courts })
}

export const GET = withErrorHandler(GET_HANDLER as any)
