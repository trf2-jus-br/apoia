import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class LibraryDao {
    // Acessibilidade de leitura (espelho de retrieveLatestPrompts):
    // proprio + favoritado (via library_uuid) + share PADRAO/PUBLICO.
    // Requer leftJoin de ia_library_favorite por (uuid, user_id corrente).
    private static accessibleFilter(userId: number) {
        return (builder: any) => {
            builder.where('ia_library.user_id', userId)
                .orWhere('ia_library.share', 'PADRAO')
                .orWhere('ia_library.share', 'PUBLICO')
                .orWhere('ia_library_favorite.user_id', userId)
        }
    }

    // Proprio ou favoritado (via library_uuid). Requer o mesmo leftJoin.
    private static ownOrFavoriteFilter(userId: number) {
        return (builder: any) => {
            builder.where('ia_library.user_id', userId)
                .orWhere('ia_library_favorite.user_id', userId)
        }
    }

    private static favoriteJoin(userId: number) {
        return function () {
            this.on('ia_library.uuid', '=', 'ia_library_favorite.library_uuid')
                .andOn('ia_library_favorite.user_id', '=', knex.raw('?', [userId]))
        }
    }

    static async listLibrary(): Promise<mysqlTypes.IALibrary[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library').select('*').where({ user_id: userId }).where('is_latest', 1).orderBy('created_at', 'desc')
        return rows
    }

    static async listLibraryHeaders(): Promise<mysqlTypes.IALibraryList[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library')
            .leftJoin('ia_library_favorite', LibraryDao.favoriteJoin(userId))
            .select('ia_library.id', 'ia_library.user_id', 'ia_library.kind', 'ia_library.model_subtype', 'ia_library.title', 'ia_library.content_type', 'ia_library.inclusion', 'ia_library.context', 'ia_library.share', 'ia_library.base_id', 'ia_library.uuid', 'ia_library.is_latest', 'ia_library.created_at', 'ia_library.created_by')
            .select(knex.raw('ia_library.user_id = ? as is_mine', [userId]))
            .select(knex.raw('CASE WHEN COUNT(ia_library_favorite.id) > 0 THEN 1 ELSE 0 END as is_favorite'))
            .select(knex.raw('(SELECT COUNT(*) FROM ia_library_favorite as lf WHERE lf.library_uuid = ia_library.uuid) as favorite_count'))
            .where('ia_library.is_latest', 1)
            .andWhere(LibraryDao.accessibleFilter(userId))
            .groupBy('ia_library.id')
            .orderByRaw('is_favorite desc, favorite_count desc, ia_library.created_at desc')
        return rows
    }

    static async listLibraryForPrompt(ids?: number[]): Promise<(Omit<mysqlTypes.IALibrary, 'content_binary'> & { is_mine: number | boolean, is_favorite: number | boolean })[]> {
        const userId = await UserDao.getCurrentUserId()
        const query = knex('ia_library')
            .leftJoin('ia_library_favorite', LibraryDao.favoriteJoin(userId))
            .select('ia_library.id', 'ia_library.user_id', 'ia_library.kind', 'ia_library.model_subtype', 'ia_library.title', 'ia_library.content_type', 'ia_library.content_markdown', 'ia_library.inclusion', 'ia_library.context', 'ia_library.share', 'ia_library.base_id', 'ia_library.uuid', 'ia_library.is_latest', 'ia_library.created_at', 'ia_library.created_by')
            .select(knex.raw('ia_library.user_id = ? as is_mine', [userId]))
            .select(knex.raw('CASE WHEN COUNT(ia_library_favorite.id) > 0 THEN 1 ELSE 0 END as is_favorite'))
            .where('ia_library.is_latest', 1)
            .andWhere(LibraryDao.accessibleFilter(userId))
            .whereNotNull('ia_library.content_markdown')
            .where('ia_library.content_markdown', '!=', '')
            .groupBy('ia_library.id')

        if (ids !== undefined) {
            // Selecao manual vence (inclui PUBLICO de terceiros); CONTEXTUAL de proprios/favoritados continua entrando como ref.
            query.andWhere(builder => {
                if (ids.length > 0) {
                    builder.whereIn('ia_library.id', ids)
                }
                builder.orWhere(inner => {
                    inner.where(LibraryDao.ownOrFavoriteFilter(userId)).where('ia_library.inclusion', mysqlTypes.IALibraryInclusion.CONTEXTUAL)
                })
            })
        } else {
            // Sem selecao explicita: proprios/favoritados com inclusao automatica + todos os PADRAO
            // (docs PADRAO entram apenas via casamento de nome com o slug do prompt, resolvido em library-defaults).
            query.andWhere(builder => {
                builder.where(inner => {
                    inner.where(LibraryDao.ownOrFavoriteFilter(userId)).whereIn('ia_library.inclusion', [mysqlTypes.IALibraryInclusion.SIM, mysqlTypes.IALibraryInclusion.CONTEXTUAL])
                }).orWhere('ia_library.share', 'PADRAO')
            })
        }

        query.orderBy('ia_library.created_at', 'desc')
        return await query
    }

    // Aceita id numerico ou uuid (ultima versao quando uuid, padrao de prompts).
    static async resolveLibraryId(id: number | string): Promise<number | undefined> {
        if (!isNaN(Number(id))) return Number(id)
        const row = await knex('ia_library').select('id').where({ uuid: String(id), is_latest: 1 }).first()
        return row?.id
    }

    static async getLibraryById(id: number | string): Promise<(mysqlTypes.IALibrary & { is_mine: boolean }) | undefined> {
        const userId = await UserDao.getCurrentUserId()
        const row = await knex('ia_library')
            .leftJoin('ia_library_favorite', LibraryDao.favoriteJoin(userId))
            .select('ia_library.*')
            .select(knex.raw('ia_library.user_id = ? as is_mine', [userId]))
            .where(builder => {
                if (isNaN(Number(id))) {
                    builder.where({ 'ia_library.uuid': String(id), 'ia_library.is_latest': 1 })
                } else {
                    builder.where('ia_library.id', Number(id))
                }
            })
            .andWhere(LibraryDao.accessibleFilter(userId))
            .first()
        return row
    }

    static async getLibrariesByIds(ids: (number | string)[]): Promise<mysqlTypes.IALibrary[]> {
        const userId = await UserDao.getCurrentUserId()
        const rows = await knex('ia_library')
            .leftJoin('ia_library_favorite', LibraryDao.favoriteJoin(userId))
            .select('ia_library.*')
            .where(builder => {
                for (const id of ids) {
                    if (isNaN(Number(id))) {
                        builder.orWhere({ 'ia_library.uuid': String(id), 'ia_library.is_latest': 1 })
                    } else {
                        builder.orWhere('ia_library.id', Number(id))
                    }
                }
            })
            .andWhere(LibraryDao.accessibleFilter(userId))
        return rows
    }

    static async insertLibrary(data: mysqlTypes.IALibraryToInsert): Promise<number> {
        const userId = await UserDao.getCurrentUserId()
        const [ret] = await knex('ia_library').insert({
            user_id: userId,
            kind: data.kind,
            title: data.title,
            content_type: data.content_type ?? null,
            content_markdown: data.content_markdown ?? null,
            content_binary: data.content_binary ?? null,
            model_subtype: data.model_subtype ?? null,
            inclusion: data.inclusion ?? mysqlTypes.IALibraryInclusion.NAO,
            context: data.context ?? null,
            share: data.share ?? mysqlTypes.IALibraryShare.PRIVADO,
            uuid: crypto.randomUUID(),
            is_latest: 1,
            created_by: userId,
        }).returning('id')
        const id = getId(ret)
        // 1a versao aponta para si propria, como em prompts
        await knex('ia_library').update({ base_id: id }).where({ id })
        return id
    }

    // Edicao cria nova versao (mesmo base_id/uuid), preservando as anteriores.
    static async updateLibrary(id: number, patch: Partial<mysqlTypes.IALibraryToInsert>): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const trx = await knex.transaction()

        try {
            const current = await trx('ia_library').where({ id, user_id: userId }).first()
            if (!current) {
                await trx.rollback()
                return false
            }

            // Desmarca a versao corrente antes de inserir a nova (indice unico parcial em uuid+is_latest)
            await trx('ia_library').update({ is_latest: 0 }).where({ base_id: current.base_id })

            const [ret] = await trx('ia_library').insert({
                user_id: current.user_id,
                kind: patch.kind ?? current.kind,
                title: patch.title !== undefined ? patch.title : current.title,
                content_type: patch.content_type !== undefined ? patch.content_type : current.content_type,
                content_markdown: patch.content_markdown !== undefined ? patch.content_markdown : current.content_markdown,
                content_binary: patch.content_binary !== undefined ? patch.content_binary : current.content_binary,
                model_subtype: patch.model_subtype !== undefined ? patch.model_subtype : current.model_subtype,
                inclusion: patch.inclusion !== undefined ? patch.inclusion : current.inclusion,
                context: patch.context !== undefined ? patch.context : current.context,
                share: patch.share !== undefined ? patch.share : current.share,
                base_id: current.base_id,
                uuid: current.uuid,
                is_latest: 1,
                created_by: current.created_by,
            }).returning('id')
            const newId = getId(ret)

            // Anexos e exemplos pertencem ao documento, nao a versao: movem para a nova versao corrente
            const versionIds: number[] = (await trx('ia_library').select('id').where({ base_id: current.base_id })).map((r: any) => r.id)
            const oldVersionIds = versionIds.filter(vid => vid !== newId)
            if (oldVersionIds.length > 0) {
                await trx('ia_library_attachment').update({ library_id: newId }).whereIn('library_id', oldVersionIds)
                await trx('ia_library_example').update({ library_id: newId }).whereIn('library_id', oldVersionIds)
            }

            await trx.commit()
            return true
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    // Remove o documento inteiro: todas as versoes do base_id + anexos/exemplos de cada versao + favoritos do uuid.
    static async deleteLibrary(id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const current = await knex('ia_library').select('id', 'base_id', 'uuid').where({ id, user_id: userId }).first()
        if (!current) return false
        const versionIds: number[] = (await knex('ia_library').select('id').where({ base_id: current.base_id })).map((r: any) => r.id)
        await knex('ia_library_attachment').delete().whereIn('library_id', versionIds)
        await knex('ia_library_example').delete().whereIn('library_id', versionIds)
        await knex('ia_library_favorite').delete().where({ library_uuid: current.uuid })
        const del = await knex('ia_library').delete().whereIn('id', versionIds)
        return del > 0
    }

    // Share e propriedade do documento (nao da versao): aplica a todas as versoes do uuid.
    static async setStandard(uuid: string): Promise<void> {
        await knex('ia_library').update({ share: 'PADRAO' }).where({ uuid })
    }

    static async setPublic(uuid: string): Promise<void> {
        await knex('ia_library').update({ share: 'PUBLICO' }).where({ uuid })
    }

    static async setPrivate(uuid: string): Promise<void> {
        await knex('ia_library').update({ share: 'PRIVADO' }).where({ uuid })
    }

    static async setUnlisted(uuid: string): Promise<void> {
        await knex('ia_library').update({ share: 'NAO_LISTADO' }).where({ uuid })
    }

    // Favoritos operam por uuid (estavel entre versoes), espelhando setFavoriteByUuid de prompts.
    static async setFavorite(uuid: string, userId: number): Promise<void> {
        const latest = await knex('ia_library').select('id').where({ uuid, is_latest: 1 }).first()
        if (!latest) return
        await knex('ia_library_favorite').insert({ library_id: latest.id, library_uuid: uuid, user_id: userId }).onConflict().ignore()
    }

    static async resetFavorite(uuid: string, userId: number): Promise<void> {
        const latest = await knex('ia_library').select('id').where({ uuid, is_latest: 1 }).first()
        if (!latest) return
        await knex('ia_library_favorite')
            .where({ library_uuid: uuid, user_id: userId })
            .orWhere({ library_id: latest.id, user_id: userId })
            .delete()
    }

    // Leitura acessivel (proprio, favoritado ou PADRAO/PUBLICO) — usada por anexos.
    private static async isLibraryAccessible(library_id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const row = await knex('ia_library as l')
            .select('l.id')
            .leftJoin('ia_library_favorite as f', function () {
                this.on('l.uuid', '=', 'f.library_uuid')
                    .andOn('f.user_id', '=', knex.raw('?', [userId]))
            })
            .where('l.id', library_id)
            .andWhere(builder => {
                builder.where('l.user_id', userId)
                    .orWhere('l.share', 'PADRAO')
                    .orWhere('l.share', 'PUBLICO')
                    .orWhere('f.user_id', userId)
            })
            .first()
        return !!row
    }

    static async listLibraryExamples(library_id: number): Promise<mysqlTypes.IALibraryExample[]> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return []
        const rows = await knex('ia_library_example').select('*').where({ library_id }).orderBy('created_at', 'desc')
        return rows
    }

    static async upsertLibraryExample(library_id: number, example: Omit<mysqlTypes.IALibraryExample, 'id' | 'created_at' | 'created_by' | 'library_id'>): Promise<void> {
        const userId = await UserDao.getCurrentUserId()
        const insertData: any = {
            library_id,
            process_number: example.process_number,
            event_number: ('event_number' in (example as any)) ? (example as any).event_number ?? null : null,
            piece_type: example.piece_type,
            piece_id: example.piece_id,
            piece_title: example.piece_title,
            piece_date: example.piece_date,
            content_markdown: example.content_markdown,
            created_by: userId,
        }
        const mergeData: any = {
            piece_type: example.piece_type,
            piece_id: example.piece_id,
            piece_title: example.piece_title,
            piece_date: example.piece_date,
            content_markdown: example.content_markdown,
        }
        if ('event_number' in (example as any)) mergeData.event_number = (example as any).event_number ?? null
        await knex('ia_library_example').insert(insertData).onConflict(['library_id', 'process_number']).merge(mergeData)
    }

    static async deleteLibraryExample(library_id: number, process_number: string): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return false
        const del = await knex('ia_library_example').delete().where({ library_id, process_number })
        return del > 0
    }

    // --- Library Attachments DAO ---
    static async listLibraryAttachments(library_id: number): Promise<Omit<mysqlTypes.IALibraryAttachment, 'content_binary'>[]> {
        if (!await LibraryDao.isLibraryAccessible(library_id)) return []
        const rows = await knex('ia_library_attachment')
            .select('id', 'library_id', 'filename', 'content_type', 'file_size', 'word_count', 'created_at', 'created_by')
            .where({ library_id })
            .orderBy('created_at', 'desc')
        return rows
    }

    static async getLibraryAttachmentById(id: number, library_id: number): Promise<mysqlTypes.IALibraryAttachment | undefined> {
        if (!await LibraryDao.isLibraryAccessible(library_id)) return undefined
        const row = await knex('ia_library_attachment').select('*').where({ id, library_id }).first()
        return row
    }

    static async insertLibraryAttachment(data: mysqlTypes.IALibraryAttachmentToInsert): Promise<number> {
        const userId = await UserDao.getCurrentUserId()
        // validate ownership (escrita de anexos continua restrita ao dono)
        const lib = await knex('ia_library').select('id').where({ id: data.library_id, user_id: userId }).first()
        if (!lib) throw new Error('Library not found or access denied')
        const [ret] = await knex('ia_library_attachment').insert({
            library_id: data.library_id,
            filename: data.filename,
            content_type: data.content_type,
            file_size: data.file_size,
            word_count: data.word_count ?? null,
            content_text: data.content_text ?? null,
            content_binary: data.content_binary,
            created_by: userId,
        }).returning('id')
        return getId(ret)
    }

    static async deleteLibraryAttachment(id: number, library_id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const lib = await knex('ia_library').select('id').where({ id: library_id, user_id: userId }).first()
        if (!lib) return false
        const del = await knex('ia_library_attachment').delete().where({ id, library_id })
        return del > 0
    }

    static async countLibraryAttachments(library_id: number): Promise<number> {
        if (!await LibraryDao.isLibraryAccessible(library_id)) return 0
        const result = await knex('ia_library_attachment').count('* as count').where({ library_id }).first()
        return result?.count as number ?? 0
    }

    static async getLibraryAttachmentsText(library_id: number): Promise<Pick<mysqlTypes.IALibraryAttachment, 'filename' | 'content_text'>[]> {
        if (!await LibraryDao.isLibraryAccessible(library_id)) return []
        const rows = await knex('ia_library_attachment')
            .select('filename', 'content_text')
            .where({ library_id })
            .whereNotNull('content_text')
        return rows
    }
}
