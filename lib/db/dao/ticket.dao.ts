import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { assertCourtId, UserType } from '../../user'

// Colunas retornadas nas listagens/detalhes (sem o blob do screenshot)
const TICKET_COLUMNS = [
    'id', 'user_id', 'username', 'user_name', 'user_email', 'system', 'court_id',
    'kind', 'message', 'error_context', 'page_url', 'user_agent',
    'screenshot_content_type', 'status', 'response', 'responded_by', 'responded_at',
    'created_at', 'updated_at'
]

export type TicketToInsert = {
    kind: mysqlTypes.IATicketKind
    message: string
    error_context?: string | null
    page_url?: string | null
    user_agent?: string | null
    screenshot?: Buffer | null
    screenshot_content_type?: string | null
}

export class TicketDao {
    // Cria um chamado com UUID gerado pela aplicacao (o UUID e o protocolo do chamado).
    // Faz snapshot dos dados do usuario (nome, email, username, system, tribunal) para
    // que o moderador veja as informacoes do solicitante mesmo se mudarem depois.
    static async createTicket(user: UserType, data: TicketToInsert): Promise<string> {
        if (!knex) throw new Error('Banco de dados não disponível')
        const id = crypto.randomUUID()
        let courtId: number | null = null
        try {
            courtId = assertCourtId(user)
        } catch {
            // tribunal não identificado; segue sem court_id
        }
        const username = user.preferredUsername || user.name
        const user_id = await UserDao.assertIAUserId(username, {
            name: user.name,
            email: user.email,
            court_id: courtId ?? undefined,
        })
        await knex('ia_ticket').insert({
            id,
            user_id,
            username: user.preferredUsername ?? null,
            user_name: user.name ?? null,
            user_email: user.email ?? null,
            system: user.system ?? null,
            court_id: courtId,
            kind: data.kind,
            message: data.message,
            error_context: data.error_context ?? null,
            page_url: data.page_url ?? null,
            user_agent: data.user_agent ?? null,
            screenshot: data.screenshot ?? null,
            screenshot_content_type: data.screenshot_content_type ?? null,
            status: 'ABERTO',
        })
        return id
    }

    static async listTickets(status?: mysqlTypes.IATicketStatus): Promise<mysqlTypes.IATicket[]> {
        if (!knex) return []
        const query = knex('ia_ticket').select(TICKET_COLUMNS).orderBy('created_at', 'desc')
        if (status) query.where({ status })
        return await query
    }

    static async listTicketsByUser(userId: number): Promise<mysqlTypes.IATicket[]> {
        if (!knex) return []
        return await knex('ia_ticket').select(TICKET_COLUMNS)
            .where({ user_id: userId })
            .orderBy('created_at', 'desc')
    }

    static async getTicket(id: string): Promise<mysqlTypes.IATicket | undefined> {
        if (!knex) return undefined
        return await knex('ia_ticket').select(TICKET_COLUMNS).where({ id }).first()
    }

    // Unico metodo que le o blob do screenshot
    static async getScreenshot(id: string): Promise<{ buffer: Buffer, contentType: string } | undefined> {
        if (!knex) return undefined
        const row = await knex('ia_ticket').select('screenshot', 'screenshot_content_type').where({ id }).first()
        if (!row?.screenshot) return undefined
        return { buffer: row.screenshot, contentType: row.screenshot_content_type || 'image/jpeg' }
    }

    static async updateTicket(id: string, data: { status: mysqlTypes.IATicketStatus, response?: string | null, responded_by?: string | null }): Promise<void> {
        if (!knex) return
        const updates: Record<string, any> = {
            status: data.status,
            updated_at: new Date(),
        }
        if (data.response !== undefined) updates.response = data.response
        if (data.responded_by) {
            updates.responded_by = data.responded_by
            updates.responded_at = new Date()
        }
        await knex('ia_ticket').update(updates).where({ id })
    }

    static async getTicketStats(): Promise<mysqlTypes.IATicketStats> {
        const empty: mysqlTypes.IATicketStats = { byStatus: [], last7Days: 0, avgResolutionHours: null, byCourt: [] }
        if (!knex) return empty

        const byStatusRows = await knex('ia_ticket').select('status').count('* as count').groupBy('status')
        const byStatus = byStatusRows.map((r: any) => ({ status: r.status as mysqlTypes.IATicketStatus, count: Number(r.count) }))

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const last7Row = await knex('ia_ticket').where('created_at', '>=', since).count('* as count').first()
        const last7Days = Number(last7Row?.count ?? 0)

        const driver = (knex as any).client?.driverName || ''
        const avgExpr = driver === 'pg'
            ? 'AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600)'
            : 'AVG(TIMESTAMPDIFF(HOUR, created_at, responded_at))'
        const avgRow: any = await knex('ia_ticket')
            .where({ status: 'RESOLVIDO' })
            .whereNotNull('responded_at')
            .select(knex.raw(`${avgExpr} as avg_hours`))
            .first()
        const avgResolutionHours = avgRow?.avg_hours != null ? Number(avgRow.avg_hours) : null

        const byCourtRows = await knex('ia_ticket')
            .select('court_id')
            .count('* as count')
            .groupBy('court_id')
            .orderBy('count', 'desc')
            .limit(5)
        const byCourt = byCourtRows.map((r: any) => ({ court_id: r.court_id ?? null, count: Number(r.count) }))

        return { byStatus, last7Days, avgResolutionHours, byCourt }
    }
}
