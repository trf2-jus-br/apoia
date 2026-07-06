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

    // ---- Anonymize ----

    // Retorna o valor EFETIVO de anonymize, respeitando a expiração de 24h.
    // undefined quando sem usuário/DB (caller faz fallback ao cookie legado).
    static async getAnonymize(): Promise<boolean | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return undefined
        const row = await knex('ia_user_prefs').where({ user_id }).first()
        if (!row) return true // default: anonimizar tudo
        const expired = row.anonymize_until && new Date(row.anonymize_until) < new Date()
        return expired ? true : !!row.anonymize
    }

    // Grava opt-out (false + until=agora+24h) ou volta ao default (true + until=null).
    static async setAnonymize(value: boolean): Promise<void> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return
        const anonymize_until = value ? null : new Date(Date.now() + 24 * 60 * 60 * 1000)
        await knex('ia_user_prefs')
            .insert({ user_id, anonymize: value, anonymize_until })
            .onConflict('user_id')
            .merge(['anonymize', 'anonymize_until'])
    }

    // ---- Beta tester ----

    static async getBetaTester(): Promise<boolean | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return undefined
        const row = await knex('ia_user_prefs').where({ user_id }).first()
        return row ? !!row.beta_tester : false
    }

    static async setBetaTester(value: boolean): Promise<void> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return
        await knex('ia_user_prefs')
            .insert({ user_id, beta_tester: value })
            .onConflict('user_id')
            .merge(['beta_tester'])
    }
}
