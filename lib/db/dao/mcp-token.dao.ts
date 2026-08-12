import knex from '../knex'
import { UserDao } from './user.dao'
import { encryptWithDatabaseSecret, decryptWithDatabaseSecret } from '../../utils/env'
import { getUserFromPdpjToken, UserType } from '../../user'

// Tabela ia_mcp_token: armazena o JWT PDPJ encriptado (DATABASE_SECRET) por usuário, com um
// token_id curto que vai na URL do config MCP. Isso mantém a URL curta (~50 chars) em vez de
// embutir o JWT encriptado (~3000 chars). 1 linha por usuário (upsert): "gerar novamente"
// substitui o token anterior, revogando-o imediatamente.
// O token_id é estável entre logins: a cada autenticação do usuário, o callback jwt do
// NextAuth chama refreshForUsername para atualizar token_ciphertext/expires_at, renovando
// a URL já configurada no cliente MCP sem reconfiguração.
export class McpTokenDao {

    // Emite (ou substitui) o token MCP do usuário corrente. Retorna o token_id curto a ser
    // embutido na URL. O expiresAt reflete o exp do JWT PDPJ (validade controlada pelo Keycloak).
    static async issueForCurrentUser(jwt: string, expiresAt: Date): Promise<string | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return undefined // 0 quando sem DB ou sem usuário

        // Aproveita a emissão para purgar tokens mortos de outros usuários (lazy cleanup,
        // sem cron). Grace de 30 dias: tokens recém-expirados são mantidos porque o próximo
        // login do usuário os renova automaticamente (refreshForUsername). Roda antes do
        // upsert; falhas aqui não impedem a emissão.
        const purgeBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        await knex('ia_mcp_token').where('expires_at', '<', purgeBefore).delete().catch((e) => {
            console.error('MCP token purge error:', e)
        })

        const token_id = crypto.randomUUID().replaceAll('-', '')
        const token_ciphertext = encryptWithDatabaseSecret(jwt)

        await knex('ia_mcp_token')
            .insert({
                user_id,
                token_id,
                token_ciphertext,
                expires_at: expiresAt,
            })
            .onConflict('user_id')
            .merge(['token_id', 'token_ciphertext', 'expires_at'])

        return token_id
    }

    // Renova o JWT PDPJ de um token MCP já emitido, mantendo o token_id (e a URL) estáveis.
    // Chamado a cada login do usuário (callback jwt do NextAuth, via import dinâmico para
    // evitar ciclo options.ts → dao → lib/user.ts → options.ts). No-op quando o usuário
    // não existe em ia_user ou nunca gerou uma URL MCP — a emissão continua sendo uma
    // ação explícita na página /mcp. Nunca lança exceção: falha aqui não pode quebrar o login.
    static async refreshForUsername(username: string, jwt: string, expiresAt: Date): Promise<void> {
        try {
            if (!knex || !username) return
            const user = await knex('ia_user').select('id').where({ username }).first()
            if (!user) return
            await knex('ia_mcp_token').where({ user_id: user.id }).update({
                token_ciphertext: encryptWithDatabaseSecret(jwt),
                expires_at: expiresAt,
            })
        } catch (e) {
            console.error('MCP token refresh error:', e)
        }
    }

    // Resolve o usuário a partir do token_id da URL. Usado pelo endpoint MCP, que não tem
    // sessão NextAuth — por isso busca direto pela token_id (não usa assertCurrentUser).
    // Retorna undefined se o token não existir, estiver expirado, ou o JWT PDPJ for inválido.
    static async resolveUserByTokenId(tokenId: string): Promise<UserType | undefined> {
        if (!knex || !tokenId) return undefined
        const row = await knex('ia_mcp_token').where({ token_id: tokenId }).first()
        if (!row) return undefined
        if (new Date(row.expires_at) < new Date()) return undefined
        try {
            const jwt = decryptWithDatabaseSecret(row.token_ciphertext)
            console.log('MCP token resolved for user_id:', row.user_id, 'token_id:', tokenId)
            return await getUserFromPdpjToken(jwt)
        } catch (error) {
            console.error('MCP token resolve error:', error)
            return undefined
        }
    }
}
