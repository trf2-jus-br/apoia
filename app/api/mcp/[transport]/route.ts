import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { UserType } from "@/lib/user"
import { McpTokenDao } from "@/lib/db/dao/mcp-token.dao"
import { registerApoiaTools } from "@/lib/mcp/mcp-registry"
import { MCP_AUTH_SCHEME, MCP_TOKEN_QUERY_PARAM } from "@/lib/mcp/mcp-constants"

// Handler MCP base: registra as tools do apoia no servidor. O user por-request é resolvido
// no verifyToken abaixo e propagado ao execute de cada tool via extra.authInfo.
//
// basePath "/api/mcp" faz o adapter derivar os endpoints como /api/mcp/mcp,
// /api/mcp/sse e /api/mcp/message, casando com a rota Next.js
// app/api/mcp/[transport]/route.ts (onde [transport] = "mcp" | "sse" | "message").
// Sem o basePath o adapter esperaria /mcp no pathname e devolveria 404.
const handler = createMcpHandler(
    (server) => {
        registerApoiaTools(server)
    },
    { serverInfo: { name: "apoia", version: "1.0.0" } },
    { maxDuration: 60, verboseLogs: false, basePath: "/api/mcp" }
)

// Monta o AuthInfo a partir do usuário resolvido. O user é propagado ao execute das tools
// via extra.authInfo.extra.user (ver lib/mcp/mcp-registry.ts).
const buildAuthInfo = (tokenId: string, user: UserType): AuthInfo => ({
    token: tokenId,
    clientId: user.preferredUsername || user.name || "unknown",
    scopes: [],
    extra: { user },
})

// Envolve o handler com autenticação. O token_id curto pode chegar de duas formas:
//   1. Header "Authorization: Apoia-MCP <token_id>" (clientes com suporte a headers)
//   2. Query param "?token=<token_id>" (mais universal, ex.: claude.ai web)
// O token_id é resolvido contra ia_mcp_token (ciphertext + expiração); o JWT PDPJ é
// decifrado e validado server-side. Tokens inexistentes ou expirados são rejeitados (401).
const authedHandler = withMcpAuth(
    handler,
    async (req): Promise<AuthInfo | undefined> => {
        // 1. Tenta pelo header Authorization
        const authHeader = req.headers.get("Authorization") || ""
        if (authHeader.startsWith(`${MCP_AUTH_SCHEME} `)) {
            const tokenId = authHeader.slice(`${MCP_AUTH_SCHEME} `.length).trim()
            const user = await McpTokenDao.resolveUserByTokenId(tokenId)
            if (user) return buildAuthInfo(tokenId, user)
        }

        // 2. Tenta pelo query param (fallback para clientes sem suporte a headers customizados)
        const queryToken = new URL(req.url).searchParams.get(MCP_TOKEN_QUERY_PARAM)
        if (queryToken) {
            const user = await McpTokenDao.resolveUserByTokenId(queryToken)
            if (user) return buildAuthInfo(queryToken, user)
        }

        return undefined
    },
    { required: true }
)

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE }
