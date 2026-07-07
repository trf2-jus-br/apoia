"use server"

import * as jose from "jose"
import { headers } from "next/headers"
import { assertCurrentUser } from "../user"
import { encrypt } from "../utils/crypt"
import { envString } from "../utils/env"
import { MCP_TOKEN_PREFIX, MCP_TOKEN_QUERY_PARAM } from "./mcp-constants"

// Endpoint streamable HTTP derivado pelo mcp-handler a partir do segmento [transport].
// Com a rota em app/api/v1/mcp/[transport]/route.ts e basePath default, o endpoint HTTP é /mcp.
const MCP_HTTP_PATH = "/api/v1/mcp/mcp"

export type McpConfigResult = {
    url: string
    expiresAt?: string
}

// Determina a origem pública (scheme + host) do servidor, respeitando proxy headers.
const getPublicOrigin = async (): Promise<string> => {
    const configured = envString("NEXTAUTH_URL")
    if (configured) return configured.replace(/\/$/, "")
    const headersList = await headers()
    const host = headersList.get("x-forwarded-host") || headersList.get("host")
    const proto = headersList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https")
    return host ? `${proto}://${host}` : ""
}

/**
 * Gera a configuração MCP no formato Claude (http) para o usuário autenticado.
 *
 * O token de acesso PDPJ (JWT cru da sessão do usuário) é encriptado com PWD_SECRET e
 * prefixado com "apoia-", e o token resultante vai embutido na própria URL como query param
 * (?token=apoia-<encrypted>). Esse formato é mais universal (funciona com clientes que não
 * suportam headers customizados, ex.: claude.ai web). O servidor decifra e valida o JWT,
 * e o token sem o prefixo é rejeitado.
 *
 * Como o token é derivado da sessão atual (Keycloak), ele expira junto com o JWT PDPJ;
 * o expiresAt reflete essa validade e o usuário deve regerar a configuração após a expiração.
 */
export const generateClaudeMcpConfig = async (): Promise<McpConfigResult> => {
    const user = await assertCurrentUser()
    if (!user.accessToken) {
        throw new Error(
            "Não há token de acesso PDPJ associado a esta sessão. " +
            "Faça login via Keycloak/PDPJ para gerar a configuração MCP."
        )
    }

    const origin = await getPublicOrigin()
    const token = `${MCP_TOKEN_PREFIX}${encrypt(user.accessToken)}`
    const url = `${origin}${MCP_HTTP_PATH}?${MCP_TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`

    // Decodifica o JWT (sem verificar assinatura) para ler a data de expiração.
    let expiresAt: string | undefined
    try {
        const decoded = jose.decodeJwt(user.accessToken)
        if (decoded.exp) {
            expiresAt = new Date(decoded.exp * 1000).toLocaleString("pt-BR")
        }
    } catch {
        // Ignora: a ausência de expiresAt apenas omite a informação na UI.
    }

    return { url, expiresAt }
}
