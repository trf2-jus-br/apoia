import knex from '../knex'
import { UserDao } from './user.dao'
import { encryptWithDatabaseSecret, decryptWithDatabaseSecret } from '../../utils/env'
import { getUserFromPdpjToken, UserType } from '../../user'

// Tabela ia_mcp_token: armazena o JWT PDPJ encriptado (DATABASE_SECRET) por usuário, com um
// token_id curto que vai na URL do config MCP. Isso mantém a URL curta (~50 chars) em vez de
// embutir o JWT encriptado (~3000 chars). 1 linha por usuário (upsert): "gerar novamente"
// substitui o token anterior, revogando-o imediatamente.
export class McpTokenDao {

    // Emite (ou substitui) o token MCP do usuário corrente. Retorna o token_id curto a ser
    // embutido na URL. O expiresAt reflete o exp do JWT PDPJ (validade controlada pelo Keycloak).
    static async issueForCurrentUser(jwt: string, expiresAt: Date): Promise<string | undefined> {
        const user_id = await UserDao.getCurrentUserId()
        if (!user_id || !knex) return undefined // 0 quando sem DB ou sem usuário

        // Aproveita a emissão para purgar tokens expirados de outros usuários (lazy cleanup,
        // sem cron). Roda antes do upsert; falhas aqui não impedem a emissão.
        await knex('ia_mcp_token').where('expires_at', '<', new Date()).delete().catch((e) => {
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
            console.log('MCP token resolved for user_id:', row.user_id, 'token_id:', tokenId, 'jwt', jwt)
            return await getUserFromPdpjToken(jwt)
        } catch (error) {
            console.error('MCP token resolve error:', error)
            return undefined
        }
    }
}
