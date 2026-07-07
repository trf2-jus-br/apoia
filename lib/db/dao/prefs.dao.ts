import { cache } from 'react'
import knex from '../knex'
import { UserDao } from './user.dao'
import { decryptWithDatabaseSecret, encryptWithDatabaseSecret } from '../../utils/env'
import { PrefsCookieType } from '../../utils/prefs-types'

export class PrefsDao {
    // cache() do React memoiza o SELECT por (user_id) dentro da mesma requisicao.
    // getPrefsForCurrentUser, getPrefsForUserId, getAnonymize e getBetaTester
    // compartilham 1 SELECT por usuario por request (e 1 decrypt do env).
    // NAO envolver as funcoes de escrita (upsert/clear/set*): elas gravam direto
    // no banco e seus efeitos colaterais devem executar a cada chamada.
    private static fetchPrefsRow = cache(async (user_id: number): Promise<any | undefined> => {
        if (!knex || !user_id) return undefined
        return await knex('ia_user_prefs').where({ user_id }).first()
    })

    static async getPrefsForCurrentUser(): Promise<PrefsCookieType | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id) return undefined // 0 quando sem DB ou sem usuário
        return PrefsDao.getPrefsForUserId(user_id)
    }

    static async getPrefsForUserId(user_id: number): Promise<PrefsCookieType | undefined> {
        if (!user_id) return undefined
        const row = await PrefsDao.fetchPrefsRow(user_id)
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

    // Limpa apenas a seleção de modelo, a flag "usar em todas as situações" e os envs.
    // Preserva anonymize/anonymize_until/beta_tester, que são controlados por outros
    // pontos da UI e não devem ser afetados pelo botão "Limpar" do formulário de prefs.
    static async clearPrefsForCurrentUser(): Promise<void> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return
        await knex('ia_user_prefs')
            .where({ user_id })
            .update({
                model: '',
                use_model_in_all_situations: false,
                env_encrypted: null,
                updated_at: knex.fn.now(),
            })
    }

    // ---- Anonymize ----

    // Retorna o valor EFETIVO de anonymize, respeitando a expiração de 24h.
    // undefined quando sem usuário/DB (caller faz fallback ao cookie legado).
    static async getAnonymize(): Promise<boolean | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return undefined
        const row = await PrefsDao.fetchPrefsRow(user_id)
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
        const row = await PrefsDao.fetchPrefsRow(user_id)
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
