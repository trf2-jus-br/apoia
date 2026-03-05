import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { slugify } from '../../utils/utils'
import { Instance, Matter, Scope } from '../../proc/process-types'
import { PublicError } from '../../utils/public-error'
import { assertCurrentUser, isUserModerator } from '../../user'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class PromptDao {
    static dehydratatePromptContent = (content: any): void => {
        if (content?.scope && content.scope.length === Object.keys(Scope).length) content.scope = null
        if (content?.instance && content.instance.length === Object.keys(Instance).length) content.instance = null
        if (content?.matter && content.matter.length === Object.keys(Matter).length) content.matter = null
    }

    static hydratatePromptContent = (content: any): void => {
        if (content?.scope === null) content.scope = Object.keys(Scope)
        if (content?.instance === null) content.instance = Object.keys(Instance)
        if (content?.matter === null) content.matter = Object.keys(Matter)
    }

    static async addInternalPrompt(category: string): Promise<mysqlTypes.IAPrompt> {
        if (!knex) return {} as mysqlTypes.IAPrompt
        const [result] = await knex('ia_prompt').insert<mysqlTypes.IAPrompt>({
            category,
            name: category,
            slug: slugify(category),
            content: JSON.stringify({ prompt: null }),
            is_latest: 1, share: 'PADRAO'
        }).returning('id')
        const id = getId(result)
        await knex('ia_prompt').update({ base_id: id }).where({ id })
        const record = await knex('ia_prompt').select<mysqlTypes.IAPrompt>('*').where({ id }).first()
        return record
    }

    static async removeInternalPrompt(category: string): Promise<boolean> {
        if (!knex) return false
        const result = await knex('ia_prompt').update({ is_latest: 0 }).where({ category })
        return result > 0
    }

    // Retrieve all latest seeded prompts for overlaying map info
    static async retrieveLatestSeededPrompts(): Promise<mysqlTypes.IAPrompt[]> {
        if (!knex) return [] as any
        const result = await knex('ia_prompt')
            .select<mysqlTypes.IAPrompt[]>('*')
            .where('is_latest', 1)
            .whereNotNull('origin')
        for (const record of result) this.hydratatePromptContent(record.content)
        return result
    }

    static async insertIAPrompt(conn: any, data: mysqlTypes.IAPromptToInsert): Promise<mysqlTypes.IAPrompt | undefined> {
        const { base_id, category, name, model_id, testset_id, share, content, created_by } = data
        const slug = slugify(name)
        const user = await assertCurrentUser()
        const isModerator = await isUserModerator(user)
        const created_by_or_current_user = isModerator && created_by ? created_by : (await UserDao.getCurrentUserId())
        if (data.base_id) {
            await knex('ia_prompt').update({ is_latest: 0 }).where({ base_id: data.base_id })
        }
        this.dehydratatePromptContent(data.content)
        const [result] = await knex('ia_prompt').insert<mysqlTypes.IAPrompt>({
            base_id: base_id,
            category, name, slug, model_id, testset_id, content: JSON.stringify(content), created_by: created_by_or_current_user, is_latest: 1, share
        }).returning('id')
        const id = getId(result)
        if (!data.base_id) {
            await knex('ia_prompt').update({ base_id: id }).where({ id })
        }
        const record = await knex('ia_prompt').select<mysqlTypes.IAPrompt>('*').where({ id }).first()
        return record
    }

    static async setOfficialPrompt(id: number): Promise<boolean> {
        const trx = await knex.transaction()

        const prompt = await PromptDao.retrievePromptById(id)
        if (!prompt) throw new PublicError('Prompt não encontrado')
        try {
            await trx('ia_prompt').update<mysqlTypes.IAPrompt>({
                is_official: 0,
            }).where({ category: prompt.category, slug: prompt.slug, id })
            await trx('ia_prompt').update<mysqlTypes.IAPrompt>({
                is_official: 1
            }).where({ id })
            await trx.commit()
            return true
        } catch (error) {
            trx.rollback()
            console.error(error?.message)
            return false
        }
    }

    static async removeOfficialPrompt(id: number): Promise<boolean> {
        const updates = await knex('ia_prompt').update({
            is_official: 0
        }).where({ id }).returning('*')
        return updates.length > 0
    }

    static async removeLatestPrompt(base_id: number): Promise<boolean> {
        const created_by = await UserDao.getCurrentUserId()
        const updates = await knex('ia_prompt').update({
            is_latest: 0
        }).where({ base_id, created_by }).returning('*')
        return updates.length > 0
    }


    static async retrievePromptById(id: number): Promise<mysqlTypes.IAPrompt | undefined> {
        const result = await knex.select().from<mysqlTypes.IAPrompt>('ia_prompt').where({ id }).first()
        this.hydratatePromptContent(result.content)
        return result
    }

    static async retrieveLatestPromptByBaseId(base_id: number): Promise<mysqlTypes.IAPrompt | undefined> {
        const result = await knex.select().from<mysqlTypes.IAPrompt>('ia_prompt').where({ base_id, is_latest: 1 }).first()
        this.hydratatePromptContent(result.content)
        return result
    }

    // Lista prompts favoritos (qualquer share) do usuário corrente trazendo somente a versão mais recente
    static async retrieveFavoriteLatestPromptsForCurrentUser(): Promise<{ base_id: number, name: string, target: string }[]> {
        const userId = await UserDao.getCurrentUserId()
        // Use DB-dialect specific JSON extraction (Postgres vs MySQL).
        const jsonTargetExpr = knex.client.config.client === 'pg'
            ? "(p.content::json ->> 'target') as target"
            : "JSON_UNQUOTE(JSON_EXTRACT(p.content, '$.target')) as target"

        const rows = await knex('ia_prompt as p')
            .innerJoin('ia_favorite as f', 'f.prompt_id', 'p.base_id')
            .select(
                'p.base_id as base_id',
                'p.name as name',
                knex.raw(jsonTargetExpr)
            )
            .where('f.user_id', userId)
            .andWhere('p.is_latest', 1)
            .orderBy('p.name', 'asc')
        return (rows || []).map(r => ({ base_id: Number((r as any).base_id), name: (r as any).name, target: (r as any).target }))
    }

    static async retrieveCountersByPromptKinds(): Promise<{ category: string, prompts: number, testsets: number }[]> {
        if (!knex) return []
        const sql = knex('ia_prompt as p')
            .select(
                'k.category',
                knex.raw('COUNT(DISTINCT p.slug) as prompts'),
                knex.raw('COUNT(DISTINCT t.slug) as testsets')
            )
            .leftJoin(
                knex
                    .select('category')
                    .from('ia_prompt')
                    .union(function () {
                        this.select('kind as category').from('ia_testset');
                    })
                    .as('k'), 'p.category', '=', 'k.category'
            )
            .leftJoin('ia_testset as t', 't.kind', '=', 'p.category')
            .groupBy('k.category');
        const result = await sql

        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }

    static async retrievePromptsByKind(conn: any, category: string): Promise<{ slug: string, name: string, versions: number, created_at: Date, modified_at: Date, official_at: Date, created_id: number, modified_id: number, official_id: number }[]> {
        if (!knex) return []
        // Consulta interna que utiliza funções de janela
        const innerQuery = knex('ia_prompt')
            .select([
                'slug',
                knex.raw(`FIRST_VALUE(created_at) OVER (PARTITION BY slug ORDER BY created_at) AS created_at`),
                knex.raw(`FIRST_VALUE(id) OVER (PARTITION BY slug ORDER BY created_at) AS created_id`),
                knex.raw(`FIRST_VALUE(created_at) OVER (PARTITION BY slug ORDER BY created_at DESC) AS modified_at`),
                knex.raw(`FIRST_VALUE(id) OVER (PARTITION BY slug ORDER BY created_at DESC) AS modified_id`),
                knex.raw(`FIRST_VALUE(name) OVER (PARTITION BY slug ORDER BY created_at DESC) AS name`)
            ])
            .where('category', category);

        // Definição da CTE t1
        const t1Query = knex
            .select([
                'slug',
                knex.raw('MIN(created_at) AS created_at'),
                knex.raw('MIN(created_id) AS created_id'),
                knex.raw('MIN(modified_at) AS modified_at'),
                knex.raw('MIN(modified_id) AS modified_id'),
                knex.raw('MIN(name) AS name'),
                knex.raw('COUNT(*) AS versions')
            ])
            .from({ p: innerQuery } as any)
            .groupBy('slug')
            .orderBy('slug');

        // Definição da CTE t2 que depende de t1
        const t2Query = knex
            .select([
                't1.*',
                knex.raw('o.id AS official_id'),
                knex.raw('o.created_at AS official_at')
            ])
            .from('t1')
            .leftJoin({ o: 'ia_prompt' }, function () {
                this.on('t1.slug', '=', 'o.slug').andOn('o.is_official', '=', knex.raw('?', [true]));
            });

        // Consulta final que utiliza as CTEs t1 e t2
        const finalQuery = knex
            .with('t1', t1Query)
            .with('t2', t2Query)
            .select('t2.*')
            .from('t2');

        // Exibe a consulta SQL gerada
        const result = await finalQuery
        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        for (const record of records) {
            this.hydratatePromptContent(record.content)
        }
        return records
    }

    static async retrievePromptsIdsAndNamesByKind(category: string): Promise<mysqlTypes.SelectableItemWithLatestAndOfficial[]> {
        if (!knex) return []
        const result = await knex('ia_prompt')
            .select('id', 'name', 'slug', 'created_at', 'is_official')
            .where('category', category)
            .orderBy('slug')
            .orderBy('created_at', 'desc')
        if (!result || result.length === 0) return []
        result.forEach((record: any, index: number) => {
            record.is_last = index === 0 || record.slug !== result[index - 1].slug
        })
        const records = result.map((record: any) => ({ ...record }))
        return records
    }

    static async retrieveOfficialPromptsIdsAndNamesByKind(category: string): Promise<{ id: number, name: string }[]> {
        if (!knex) return []
        const rows = await knex('ia_prompt').select('id', 'name').where({ category, is_latest: 1, official: 1 }).orderBy('name')
        return rows
    }

    static async retrievePromptUsageReport(params: { court_id?: number, startDate?: string, endDate?: string }): Promise<mysqlTypes.PromptUsageReportRow[]> {
        if (!knex) return []
        const { court_id, startDate, endDate } = params

        const query = knex('ia_generation as g')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .leftJoin('ia_prompt as p', 'p.id', 'g.prompt_id')
            .select(
                knex.raw('g.prompt as prompt_key'),
                knex.raw('p.name as prompt_name'),
                knex.raw('EXTRACT(MONTH FROM g.created_at) as month'),
                knex.raw('EXTRACT(YEAR FROM g.created_at) as year'),
                knex.raw('COUNT(g.id) as usage_count')
            )

        if (court_id) {
            query.where('u.court_id', court_id)
        }
        if (startDate) {
            query.andWhere('g.created_at', '>=', startDate + ' 00:00:00')
        }
        if (endDate) {
            query.andWhere('g.created_at', '<=', endDate + ' 23:59:59')
        }

        query.groupBy('g.prompt', 'p.name', knex.raw('EXTRACT(MONTH FROM g.created_at)'), knex.raw('EXTRACT(YEAR FROM g.created_at)'))
        query.orderBy('year', 'desc').orderBy('month', 'desc').orderBy('g.prompt')

        const rows: any[] = await query

        return rows.map(r => {
            // Use prompt_name from JOIN, fallback to prompt_key
            const promptName = r.prompt_name || r.prompt_key
            return {
                prompt_key: r.prompt_key,
                prompt_name: promptName,
                month: Number(r.month),
                year: Number(r.year),
                usage_count: Number(r.usage_count) || 0,
            }
        })
    }

    static async retrievePromptUsageDetail(params: { prompt_key: string, month: number, year: number, court_id?: number }): Promise<mysqlTypes.PromptUsageDetailRow[]> {
        if (!knex) return []
        const { prompt_key, month, year, court_id } = params

        // Check if prompt_key is in format "prompt-X" and extract the ID for optimization
        const promptMatch = /^prompt-(\d+)$/.exec(prompt_key)
        const promptId = promptMatch ? parseInt(promptMatch[1], 10) : null

        const query = knex('ia_generation as g')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .select(
                knex.raw('u.id as user_id'),
                knex.raw('u.name as user_name'),
                knex.raw('u.username as username'),
                knex.raw('COUNT(g.id) as usage_count')
            )
            .whereRaw('EXTRACT(MONTH FROM g.created_at) = ?', [month])
            .whereRaw('EXTRACT(YEAR FROM g.created_at) = ?', [year])

        // Use indexed prompt_id if available, otherwise fallback to prompt text
        if (promptId !== null) {
            query.where('g.prompt_id', promptId)
        } else {
            query.where('g.prompt', prompt_key)
        }

        if (court_id) {
            query.where('u.court_id', court_id)
        }

        query.groupBy('u.id', 'u.name', 'u.username')
        query.orderBy('usage_count', 'desc')

        const rows: any[] = await query

        return rows.map(r => ({
            user_id: Number(r.user_id) || 0,
            user_name: r.user_name ?? null,
            username: r.username ?? null,
            usage_count: Number(r.usage_count) || 0,
        }))
    }

    static async setFavorite(promptId: number, userId: number): Promise<void> {
        if (!knex) return
        await knex('ia_favorite').insert({ prompt_id: promptId, user_id: userId }).onConflict().ignore()
    }

    static async resetFavorite(promptId: number, userId: number): Promise<void> {
        if (!knex) return
        await knex('ia_favorite').where({ prompt_id: promptId, user_id: userId }).delete()
    }

    static async setPrivate(promptId: number): Promise<void> {
        if (!knex) return
        await knex('ia_prompt').update({ share: 'PRIVADO' }).where({ id: promptId })
    }

    static async setUnlisted(promptId: number): Promise<void> {
        if (!knex) return
        await knex('ia_prompt').update({ share: 'NAO_LISTADO' }).where({ id: promptId })
    }

    static async setPublic(promptId: number): Promise<void> {
        if (!knex) return
        await knex('ia_prompt').update({ share: 'PUBLICO' }).where({ id: promptId })
    }

    static async setStandard(promptId: number): Promise<void> {
        if (!knex) return
        await knex('ia_prompt').update({ share: 'PADRAO' }).where({ id: promptId })
    }

    static async retrieveOfficialPrompts(): Promise<mysqlTypes.IAPrompt[]> {
        if (!knex) return
        const result = await knex('ia_prompt').select<Array<mysqlTypes.IAPrompt>>('*').where({ is_official: 1 })
        if (!result || result.length === 0) return []
        for (const record of result) {
            this.hydratatePromptContent(record.content)
        }
        return result
    }

    static async retrieveLatestPrompts(user_id: number, moderator?: boolean): Promise<mysqlTypes.IAPromptList[]> {
        if (!knex) return
        const result = await knex('ia_prompt')
            .leftJoin('ia_favorite as f', function () {
                this.on('ia_prompt.base_id', '=', 'f.prompt_id')
                    .andOn('f.user_id', '=', knex.raw('?', [user_id]));
            })
            .select(
                'ia_prompt.*',
                knex.raw('(ia_prompt.created_by = ?) as is_mine', [user_id]),
                knex.raw('CASE WHEN COUNT(f.prompt_id) > 0 THEN 1 ELSE 0 END as is_favorite'),
                knex.raw('(SELECT COUNT(*) FROM ia_favorite as f WHERE f.prompt_id = ia_prompt.base_id) as favorite_count')
            )
            .where('ia_prompt.is_latest', 1)
            .andWhere(function () {
                this.where('ia_prompt.created_by', user_id)
                    .orWhere('ia_prompt.share', 'PADRAO')
                    .orWhere('ia_prompt.share', 'PUBLICO')
                    .orWhere(function () {
                        if (moderator) {
                            this.orWhere('ia_prompt.share', 'EM_ANALISE')
                        }
                    })
                    .orWhere(function () {
                        this.where('ia_prompt.share', 'NAO_LISTADO')
                            .whereNotNull('f.prompt_id')
                    })
            })
            .groupBy('ia_prompt.id')

        if (!result || result.length === 0) return []
        for (const record of result) {
            this.hydratatePromptContent(record.content)
        }
        result.sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1
            if (!a.is_favorite && b.is_favorite) return 1
            if (a.favorite_count > b.favorite_count) return -1
            if (a.favorite_count < b.favorite_count) return 1
            return 0
        })
        return result
    }

    static async retrievePromptsByKindAndSlug(category: string, slug: string): Promise<mysqlTypes.IAPrompt[]> {
        if (!knex) return [] as any
        const result = await knex('ia_prompt as p')
            .select<mysqlTypes.IAPrompt[]>('p.*', 's.score')
            .leftJoin('ia_prompt_stats as s', function () {
                this.on('p.category', '=', 's.kind')
                    .andOn('p.model_id', '=', 's.model_id')
                    .andOn('p.id', '=', 's.prompt_id');
            })
            .where('p.category', category)
            .andWhere('p.slug', slug)
            .orderBy('p.created_at', 'desc');

        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }
}
