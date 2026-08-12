"use server"

import * as jose from "jose"
import { headers } from "next/headers"
import { assertCurrentUser } from "../user"
import { envString } from "../utils/env"
import { McpTokenDao } from "../db/dao/mcp-token.dao"
import { MCP_TOKEN_QUERY_PARAM } from "./mcp-constants"

// Endpoint streamable HTTP derivado pelo mcp-handler a partir do segmento [transport].
// Com a rota em app/api/mcp/[transport]/route.ts e basePath "/api/mcp", o endpoint HTTP é /api/mcp/mcp.
const MCP_HTTP_PATH = "/api/mcp/mcp"

export type McpConfigResult = {
    url: string
    expiresAt?: string
}

// Determina a origem pública (scheme + host) do servidor, respeitando proxy headers.
const getPublicOrigin = async (): Promise<string> => {
    const configured = envString("NEXT_PUBLIC_URL")
    if (configured) return configured.replace(/\/$/, "")
    const headersList = await headers()
    const host = headersList.get("x-forwarded-host") || headersList.get("host")
    const proto = headersList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https")
    return host ? `${proto}://${host}` : ""
}

/**
 * Gera a URL de configuração MCP para o usuário autenticado.
 *
 * O token de acesso PDPJ (JWT cru da sessão) é encriptado com DATABASE_SECRET e armazenado
 * server-side em ia_mcp_token; a URL recebe apenas um token_id curto (~32 chars) como query
 * param (?token=<id>). Isso mantém a URL compacta (~50 chars), dentro do limite de 2048 dos
 * clientes MCP. O endpoint decifra o JWT a partir do token_id e valida via getUserFromPdpjToken.
 *
 * 1 token por usuário (upsert): "gerar novamente" revoga o token anterior imediatamente.
 * O token_id é estável: a cada login do usuário o JWT armazenado é renovado automaticamente
 * (callback jwt do NextAuth → McpTokenDao.refreshForUsername), então a URL configurada no
 * cliente MCP não precisa ser regerada. O expiresAt reflete a validade do JWT atual.
 */
export const generateClaudeMcpConfig = async (): Promise<McpConfigResult> => {
    const user = await assertCurrentUser()
    if (!user.accessToken) {
        throw new Error(
            "Não há token de acesso PDPJ associado a esta sessão. " +
            "Faça login via Keycloak/PDPJ para gerar a URL MCP."
        )
    }

    // Lê o exp do JWT para gravar na tabela e exibir na UI.
    let expMs: number | undefined
    let expiresAt: string | undefined
    try {
        const decoded = jose.decodeJwt(user.accessToken)
        if (decoded.exp) {
            expMs = decoded.exp * 1000
            expiresAt = new Date(expMs).toLocaleString("pt-BR")
        }
    } catch {
        // Ignora: sem exp o token ainda funciona, só não exibe/honra expiração.
    }
    if (!expMs) {
        throw new Error("O token PDPJ não contém data de expiração (exp). Não é possível emitir a URL MCP.")
    }

    const tokenId = await McpTokenDao.issueForCurrentUser(user.accessToken, new Date(expMs))
    if (!tokenId) {
        throw new Error("Não foi possível emitir o token MCP (banco de dados indisponível?).")
    }

    const origin = await getPublicOrigin()
    const url = `${origin}${MCP_HTTP_PATH}?${MCP_TOKEN_QUERY_PARAM}=${tokenId}`

    return { url, expiresAt }
}
