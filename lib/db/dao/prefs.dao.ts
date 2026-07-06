import knex from '../knex'
import { UserDao } from './user.dao'
import { decryptWithDatabaseSecret, encryptWithDatabaseSecret } from '../../utils/env'
import { PrefsCookieType } from '../../utils/prefs-types'

export class PrefsDao {
    static async getPrefsForCurrentUser(): Promise<PrefsCookieType | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id) return undefined // 0 quando sem DB ou sem usuário
        return PrefsDao.getPrefsForUserId(user_id)
    }

    static async getPrefsForUserId(user_id: number): Promise<PrefsCookieType | undefined> {
        if (!knex || !user_id) return undefined
        const row = await knex('ia_user_prefs').where({ user_id }).first()
        if (!row) return undefined
        const env = row.env_encrypted
            ? JSON.parse(decryptWithDatabaseSecret(row.env_encrypted))
            : {}
        return {
            model: row.model || '',
            useModelInAllSituations: !!row.use_model_in_all_situations,
            env,
        }
    }

    static async upsertPrefsForCurrentUser(prefs: PrefsCookieType): Promise<number | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id) return undefined // sem usuário/DB -> caller faz fallback p/ cookie
        const env_encrypted = prefs.env && Object.keys(prefs.env).length > 0
            ? encryptWithDatabaseSecret(JSON.stringify(prefs.env))
            : null
        await knex('ia_user_prefs')
            .insert({
                user_id,
                model: prefs.model || '',
                use_model_in_all_situations: !!prefs.useModelInAllSituations,
                env_encrypted,
                updated_at: knex.fn.now(),
            })
            .onConflict('user_id')
            .merge()
        return user_id
    }

    static async clearPrefsForCurrentUser(): Promise<void> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return
        await knex('ia_user_prefs').where({ user_id }).delete()
    }
}
