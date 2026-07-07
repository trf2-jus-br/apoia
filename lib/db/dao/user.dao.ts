import { cache } from 'react'
import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { assertCurrentUser } from '../../user'
import { getId } from './utils'
import { dailyLimits } from '../../utils/limits'
import { OutOfQuotaError } from '@/lib/utils/api-error'

export class UserDao {
    // cache() do React memoiza por requisição: varias chamadas no mesmo request = 1 lookup no banco.
    // Seguro para dados de usuario porque e isolado por request (nao persiste entre usuarios).
    static getCurrentUserId = cache(async (): Promise<number> => {
        const user = await assertCurrentUser()
        return await UserDao.assertIAUserId(user.preferredUsername || user.name)
    })

    // Lookup puro (somente leitura) memoizado por (username) dentro da mesma requisicao.
    // Importante: NAO envolver assertIAUserId inteira em cache() porque ela tem efeitos
    // colaterais (update de userFields) que precisam executar a cada chamada.
    private static lookupIAUser = cache(async (username: string): Promise<any | null> => {
        if (!knex) return null
        return await knex('ia_user').select('*').where({ username }).first()
    })

    static async assertIAUserId(username: string, userFields?: mysqlTypes.IAUserUpdateFields): Promise<number> {
        if (!knex) return 0
        const user = await UserDao.lookupIAUser(username)
        if (user) {
            // Update user fields if provided and different from existing values
            if (userFields) {
                const updates: Partial<mysqlTypes.IAUserUpdateFields> = {}

                // Check each field and add to updates if provided and different
                if (userFields.name !== undefined && userFields.name !== user.name) {
                    updates.name = userFields.name
                }
                if (userFields.cpf !== undefined && userFields.cpf !== user.cpf) {
                    updates.cpf = userFields.cpf
                }
                if (userFields.email !== undefined && userFields.email !== user.email) {
                    updates.email = userFields.email
                }
                if (userFields.unit_id !== undefined && userFields.unit_id !== user.unit_id) {
                    updates.unit_id = userFields.unit_id
                }
                if (userFields.unit_name !== undefined && userFields.unit_name !== user.unit_name) {
                    updates.unit_name = userFields.unit_name
                }
                if (userFields.court_id !== undefined && userFields.court_id !== user.court_id) {
                    updates.court_id = userFields.court_id
                }
                if (userFields.court_name !== undefined && userFields.court_name !== user.court_name) {
                    updates.court_name = userFields.court_name
                }
                if (userFields.state_abbreviation !== undefined && userFields.state_abbreviation !== user.state_abbreviation) {
                    updates.state_abbreviation = userFields.state_abbreviation
                }

                // Perform update if there are changes
                if (Object.keys(updates).length > 0) {
                    await knex('ia_user').update(updates).where({ id: user.id })
                }
            }
            return user.id
        }
        const [result] = await knex('ia_user').insert({
            username,
            ...userFields
        }).returning('id')
        return getId(result)
    }

    static async addToIAUserDailyUsage(user_id: number, court_id: number, input_tokens_count: number, output_tokens_count: number, approximate_cost: number): Promise<void> {
        if (!knex) return
        const usage_date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        const userDailyUsageId = await knex('ia_user_daily_usage').select('id').where({ usage_date, user_id }).first()
        if (userDailyUsageId) {
            // Update existing record
            await knex('ia_user_daily_usage').where({ id: userDailyUsageId.id }).update({
                usage_count: knex.raw('usage_count + ?', [1]),
                input_tokens_count: knex.raw('input_tokens_count + ?', [input_tokens_count]),
                output_tokens_count: knex.raw('output_tokens_count + ?', [output_tokens_count]),
                approximate_cost: knex.raw('approximate_cost + ?', [approximate_cost]),
                court_id
            })
        }
        else {
            // Insert new record
            await knex('ia_user_daily_usage').insert({
                usage_date,
                user_id,
                court_id,
                usage_count: 1,
                input_tokens_count,
                output_tokens_count,
                approximate_cost
            })
        }

        const courtDailyUsageId = await knex('ia_user_daily_usage').select('id').where({ usage_date, court_id, user_id: null }).first()
        if (courtDailyUsageId) {
            // Update existing record
            await knex('ia_user_daily_usage').where({ id: courtDailyUsageId.id }).update({
                usage_count: knex.raw('usage_count + ?', [1]),
                input_tokens_count: knex.raw('input_tokens_count + ?', [input_tokens_count]),
                output_tokens_count: knex.raw('output_tokens_count + ?', [output_tokens_count]),
                approximate_cost: knex.raw('approximate_cost + ?', [approximate_cost])
            })
        }
        else {
            // Insert new record
            await knex('ia_user_daily_usage').insert({
                usage_date,
                court_id,
                usage_count: 1,
                input_tokens_count,
                output_tokens_count,
                approximate_cost
            })
        }
    }

    static async retrieveCourtMonthlyUsage(court_id: number, startDate: string, endDate: string): Promise<mysqlTypes.CourtUsageData[]> {
        if (!knex) return [];

        const records = await knex('ia_user_daily_usage')
            .select('usage_date', 'usage_count', 'approximate_cost')
            .whereNull('user_id') // Ensures we get court-level records, not user-specific ones
            .andWhere({ court_id })
            .andWhere('usage_date', '>=', startDate)
            .andWhere('usage_date', '<', endDate)
            .orderBy('usage_date', 'asc');

        return records.map(record => ({
            date: record.usage_date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
            usage_count: Number(record.usage_count), // Ensure correct types
            approximate_cost: Number(record.approximate_cost) // Ensure correct types
        }));
    }

    static async retrieveUserMonthlyUsageByCourt(court_id: number, startDate: string, endDate: string): Promise<mysqlTypes.UserUsageData[]> {
        if (!knex) return [];

        const records = await knex('ia_user_daily_usage as udu')
            .select(
                'u.username', 'u.name', 'u.id as user_id',
                knex.raw('SUM(udu.usage_count) as usage_count'),
                knex.raw('SUM(udu.input_tokens_count) as input_tokens_count'),
                knex.raw('SUM(udu.output_tokens_count) as output_tokens_count'),
                knex.raw('SUM(udu.approximate_cost) as approximate_cost')
            )
            .join('ia_user as u', 'udu.user_id', 'u.id')
            .whereNotNull('udu.user_id')
            .andWhere('udu.court_id', court_id)
            .andWhere('udu.usage_date', '>=', startDate)
            .andWhere('udu.usage_date', '<', endDate)
            .groupBy('u.id', 'u.username', 'u.name')
            .orderBy('approximate_cost', 'desc');

        return records.map(record => ({
            id: record.user_id,
            username: record.username,
            name: record.name,
            usage_count: Number(record.usage_count),
            input_tokens_count: Number(record.input_tokens_count),
            output_tokens_count: Number(record.output_tokens_count),
            approximate_cost: Number(record.approximate_cost)
        }));
    }

    static async retrieveUserDailyUsage(user_id: number, court_id: number, startDate: string, endDate: string): Promise<mysqlTypes.DailyUsageData[]> {
        if (!knex) return [];

        const records = await knex('ia_user_daily_usage')
            .select('usage_date', 'usage_count', 'input_tokens_count', 'output_tokens_count', 'approximate_cost')
            .where({ user_id, court_id })
            .andWhere('usage_date', '>=', startDate)
            .andWhere('usage_date', '<', endDate)
            .orderBy('usage_date', 'asc');

        return records.map(record => ({
            date: record.usage_date.toISOString().split('T')[0],
            usage_count: Number(record.usage_count),
            input_tokens_count: Number(record.input_tokens_count),
            output_tokens_count: Number(record.output_tokens_count),
            approximate_cost: Number(record.approximate_cost)
        }));
    }

    static async assertIAUserDailyUsageId(user_id: number, court_id: number): Promise<void> {
        if (!knex) return
        const usage_date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

        const userDailyUsageId = await knex('ia_user_daily_usage').select('id', 'usage_count', 'input_tokens_count', 'output_tokens_count', 'approximate_cost')
            .where({ usage_date, user_id }).first()

        const { user_usage_count, user_usage_cost, court_usage_count, court_usage_cost } = dailyLimits(court_id)

        if (userDailyUsageId) {
            if (user_usage_count && user_usage_count > 0 && userDailyUsageId.usage_count >= user_usage_count) {
                throw new OutOfQuotaError(`Limite diário de consultas do usuário foi atingido, por favor, aguarde até amanhã para poder usar novamente.`)
            }
            if (user_usage_cost && user_usage_cost > 0 && userDailyUsageId.approximate_cost >= user_usage_cost) {
                throw new OutOfQuotaError(`Limite diário de gastos do usuário foi atingido, por favor, aguarde até amanhã para poder usar novamente.`)
            }
        }

        const courtDailyUsageId = await knex('ia_user_daily_usage').select('id', 'usage_count', 'input_tokens_count', 'output_tokens_count', 'approximate_cost')
            .where({ usage_date, court_id, user_id: null }).first()
        if (courtDailyUsageId) {
            if (court_usage_count && court_usage_count > 0 && courtDailyUsageId.usage_count >= court_usage_count) {
                throw new OutOfQuotaError(`Limite diário de consultas do tribunal foi atingido, por favor, aguarde até amanhã para poder usar novamente.`)
            }
            if (court_usage_cost && court_usage_cost > 0 && courtDailyUsageId.approximate_cost >= court_usage_cost) {
                throw new OutOfQuotaError(`Limite diário de gastos do tribunal foi atingido, por favor, aguarde até amanhã para poder usar novamente.`)
            }
        }
    }

    /**
     * Relatório de uso de IA agrupado por processo ou por usuário.
     * @param cpfs Lista de CPFs (sem pontuação) ou vazio para todos
     * @param startDate Data inicial (inclusive) no formato YYYY-MM-DD
     * @param endDate Data final (inclusive) no formato YYYY-MM-DD
     * @param groupBy 'process' | 'user'
     */
    static async retrieveIAUsageReport(params: { processes?: string[], cpfs?: string[], startDate?: string, endDate?: string, groupBy: 'process' | 'user' }): Promise<mysqlTypes.IAUsageReportRow[]> {
        if (!knex) return []
        const { processes, cpfs, startDate, endDate, groupBy } = params
        const g = knex('ia_generation as g')
            .leftJoin('ia_dossier as d', 'd.id', 'g.dossier_id')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .select(
                knex.raw('u.id as user_id'),
                knex.raw('u.username as username'),
                knex.raw('u.name as user_name'),
                knex.raw('u.cpf as cpf'),
                knex.raw('d.id as dossier_id'),
                knex.raw('d.code as dossier_code'),
                knex.raw('MIN(g.created_at) as first_generation_at'),
                knex.raw('MAX(g.created_at) as last_generation_at'),
                knex.raw('COUNT(g.id) as generations_count'),
                knex.raw('COALESCE(SUM(g.approximate_cost),0) as approximate_cost_sum')
            )
            .whereNotNull('g.dossier_id')

        if (processes && processes.length > 0) {
            g.whereIn('d.code', processes)
        }
        if (cpfs && cpfs.length > 0) {
            g.whereIn('u.cpf', cpfs.map(c => c.trim()))
        }
        if (startDate) {
            g.andWhere('g.created_at', '>=', startDate + ' 00:00:00')
        }
        if (endDate) {
            g.andWhere('g.created_at', '<=', endDate + ' 23:59:59')
        }

        g.groupBy('d.id', 'd.code', 'u.id', 'u.username', 'u.name', 'u.cpf')

        if (groupBy === 'process') {
            g.orderBy('d.code').orderBy('u.name')
        } else {
            g.orderBy('u.name').orderBy('d.code')
        }

        const rows: any[] = await g

        return rows.map(r => ({
            user_id: r.user_id ? Number(r.user_id) : null,
            username: r.username ?? null,
            user_name: r.user_name ?? null,
            dossier_id: r.dossier_id ? Number(r.dossier_id) : null,
            dossier_code: r.dossier_code ?? null,
            first_generation_at: r.first_generation_at ? new Date(r.first_generation_at) : null,
            last_generation_at: r.last_generation_at ? new Date(r.last_generation_at) : null,
            generations_count: Number(r.generations_count) || 0,
            approximate_cost_sum: Number(r.approximate_cost_sum) || 0,
            user_cpf: r.cpf ?? null,
        })) as any
    }

    static async retrieveIAUsageDetail(params: { dossier_code: string, user_cpf?: string, startDate?: string, endDate?: string, isModerator: boolean, currentUserCpf?: string }): Promise<mysqlTypes.IAUsageDetailRow[]> {
        if (!knex) return []
        const { dossier_code, user_cpf, startDate, endDate, isModerator, currentUserCpf } = params
        const q = knex('ia_generation as g')
            .leftJoin('ia_dossier as d', 'd.id', 'g.dossier_id')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .select(
                'g.id as id',
                'd.code as dossier_code',
                'u.id as user_id',
                'u.username as username',
                'u.name as user_name',
                'u.cpf as user_cpf',
                'g.created_at as created_at',
                'g.generation as generation',
                'g.prompt_payload as prompt_payload',
                'g.approximate_cost as approximate_cost',
                'g.model as model',
                'g.prompt as prompt'
            )
            .where('d.code', dossier_code)
            .whereNotNull('g.dossier_id')

        if (startDate) q.andWhere('g.created_at', '>=', startDate + ' 00:00:00')
        if (endDate) q.andWhere('g.created_at', '<=', endDate + ' 23:59:59')

        if (isModerator) {
            if (user_cpf) q.andWhere('u.cpf', user_cpf)
        } else {
            const enforcedCpf = (currentUserCpf || '').replace(/\D/g, '')
            if (!enforcedCpf) return []
            q.andWhere('u.cpf', enforcedCpf)
        }

        q.orderBy('g.created_at', 'asc')
        const rows: any[] = await q
        return rows.map(r => ({
            id: Number(r.id),
            dossier_code: r.dossier_code ?? null,
            user_id: r.user_id ? Number(r.user_id) : null,
            username: r.username ?? null,
            user_name: r.user_name ?? null,
            user_cpf: r.user_cpf ?? null,
            created_at: r.created_at ? new Date(r.created_at) : null,
            generation: r.generation ?? null,
            prompt_payload: r.prompt_payload ?? null,
            approximate_cost: r.approximate_cost != null ? Number(r.approximate_cost) : null,
            model: r.model ?? null,
            prompt: r.prompt ?? null,
        }))
    }
}
