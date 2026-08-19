import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { slugify } from '../../utils/utils'
import { UserDao } from './user.dao'
import { getId } from './utils'
import { getCurrentUser, isUserModerator } from '../../user'
import { PublicError } from '../../utils/public-error'

const assertModerator = async (message: string) => {
    const user = await getCurrentUser()
    if (!user || !(await isUserModerator(user))) throw new PublicError(message)
}

export class TestsetDao {
    static async insertIATestset(data: mysqlTypes.IATestsetToInsert): Promise<mysqlTypes.IATestset | undefined> {
        const { base_testset_id, kind, name, model_id, content } = data
        const slug = slugify(name)
        const created_by = await UserDao.getCurrentUserId()
        const [insertedid] = await knex('ia_testset').insert({
            base_id: base_testset_id, kind, name, slug, model_id, content, created_by
        }).returning('id')
        const inserted = await knex.select().from<mysqlTypes.IATestset>('ia_testset').where({ id: getId(insertedid) }).first()
        return inserted
    }

    static async setOfficialTestset(id: number): Promise<boolean> {
        await assertModerator('Apenas moderadores podem promover testsets a oficiais')
        const trx = await knex.transaction()
        try {
            const testset = await TestsetDao.retrieveTestsetById(id)
            if (!testset) throw new Error('Testset not found')
            const { kind, slug } = testset
            await trx('ia_testset').update({
                is_official: 0
            }).where({
                kind,
                slug,
                id
            })
            await trx('ia_testset').update<mysqlTypes.IAPrompt>({
                is_official: 1
            }).where({ id })
            await trx.commit()
            return true
        } catch (error) {
            await trx.rollback()
            console.error(`Dao error ${error?.message}`)
            return false
        }
    }

    static async removeOfficialTestset(id: number): Promise<boolean> {
        await assertModerator('Apenas moderadores podem remover testsets oficiais')
        await knex('ia_testset').update({ is_official: 0 }).where({ id })
        return true
    }

    static async retrieveTestsetById(id: number): Promise<mysqlTypes.IATestset | undefined> {
        if (!knex) return
        const result = await knex.select().from<mysqlTypes.IATestset>('ia_testset').where({ id }).first()
        return result
    }

    static async retrieveTestsetsByKind(conn: any, kind: string): Promise<{ slug: string, name: string, versions: number, created: Date, modified: Date }[]> {
        if (!knex) return []
        // Consulta interna que utiliza funções de janela
        const innerQuery = knex('ia_testset')
            .select([
                'slug',
                knex.raw(`FIRST_VALUE(created_at) OVER (PARTITION BY slug ORDER BY created_at) AS created_at`),
                knex.raw(`FIRST_VALUE(id) OVER (PARTITION BY slug ORDER BY created_at) AS created_id`),
                knex.raw(`FIRST_VALUE(created_at) OVER (PARTITION BY slug ORDER BY created_at DESC) AS modified_at`),
                knex.raw(`FIRST_VALUE(id) OVER (PARTITION BY slug ORDER BY created_at DESC) AS modified_id`),
                knex.raw(`FIRST_VALUE(name) OVER (PARTITION BY slug ORDER BY created_at DESC) AS name`)
            ])
            .where('kind', kind)

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
            .orderBy('slug')

        // Definição da CTE t2 que depende de t1
        const t2Query = knex
            .select([
                't1.*',
                knex.raw('o.id AS official_id'),
                knex.raw('o.created_at AS official_at')
            ])
            .from('t1')
            .leftJoin({ o: 'ia_testset' }, function () {
                this.on('t1.slug', '=', 'o.slug').andOn('o.is_official', '=', knex.raw('?', [true]))
            })

        // Consulta final que utiliza as CTEs t1 e t2
        const finalQuery = knex
            .with('t1', t1Query)
            .with('t2', t2Query)
            .select('t2.*')
            .from('t2');

        // Ou para ver a consulta SQL gerada:
        // devLog('***testsets', finalQuery.toString());
        const result = await finalQuery
        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }

    static async retrieveOfficialTestsetsIdsAndNamesByKind(kind: string): Promise<{ id: string, name: string }[]> {
        if (!knex) return []
        const result = await knex('ia_testset').select<Array<mysqlTypes.IATestset>>('id', 'name').where({
            kind, is_official: 1
        })
        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }

    static async retrieveTestsetsByKindAndSlug(kind: string, slug: string): Promise<{ id: number, testset_id: number, model_id: number, kind: string, name: string, slug: string, content: any, created_by: number, created_at: Date, is_official: boolean, testset_slug: string, testset_name: string, model_name: string, user_username: string, score: number }[]> {
        if (!knex) return []
        const result = await knex('ia_testset as p')
            .select(
                'p.id',
                'p.model_id',
                'p.kind',
                'p.name',
                'p.slug',
                'p.content',
                'p.created_by',
                'p.created_at',
                'p.is_official',
                'm.name as model_name',
                'u.username as user_username'
            )
            .leftJoin('ia_model as m', 'p.model_id', 'm.id')
            .leftJoin('ia_user as u', 'p.created_by', 'u.id')
            .where({ 'p.kind': kind, 'p.slug': slug })
            .andWhere('p.slug', slug)
            .orderBy('p.created_at', 'desc');
        if (!result || result.length === 0) return []
        const records = result.map((record: any) => ({ ...record }))
        return records
    }
}
