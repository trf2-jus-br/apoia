import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { decrypt } from "@/lib/utils/crypt"
import { UserType, getUserFromPdpjToken } from "@/lib/user"
import { registerApoiaTools } from "@/lib/mcp/mcp-registry"
import { MCP_AUTH_SCHEME, MCP_TOKEN_PREFIX, MCP_TOKEN_QUERY_PARAM } from "@/lib/mcp/mcp-constants"

// Handler MCP base: registra as tools do apoia no servidor. O user por-request é resolvido
// no verifyToken abaixo e propagado ao execute de cada tool via extra.authInfo.
const handler = createMcpHandler(
    (server) => {
        registerApoiaTools(server)
    },
    { serverInfo: { name: "apoia", version: "1.0.0" } },
    { maxDuration: 60, verboseLogs: false }
)

// Recebe o token MCP do apoia (com prefixo "apoia-"), valida o prefixo, decifra e resolve o
// usuário. Retorna undefined se o token não tiver o prefixo (rejeitado sem tentar decifrar),
// se a decifração falhar, ou se o JWT PDPJ não for válido.
const resolveUserFromApoiaToken = async (raw: string): Promise<UserType | undefined> => {
    if (!raw.startsWith(MCP_TOKEN_PREFIX)) return undefined
    try {
        const ciphertext = raw.slice(MCP_TOKEN_PREFIX.length)
        const rawJwt = decrypt(ciphertext)
        return await getUserFromPdpjToken(rawJwt)
    } catch (error) {
        console.error("MCP token resolve error:", error)
        return undefined
    }
}

// Monta o AuthInfo a partir do usuário resolvido. O user é propagado ao execute das tools
// via extra.authInfo.extra.user (ver lib/ai/mcp-registry.ts).
const buildAuthInfo = (rawJwt: string, user: UserType): AuthInfo => ({
    token: rawJwt,
    clientId: user.preferredUsername || user.name || "unknown",
    scopes: [],
    extra: { user },
})

// Envolve o handler com autenticação. O token pode chegar de duas formas:
//   1. Header "Authorization: Apoia-MCP apoia-<encrypted>" (clientes com suporte a headers)
//   2. Query param "?token=apoia-<encrypted>" (mais universal, ex.: claude.ai web)
// Em ambos os casos o token deve ter o prefixo "apoia-"; caso contrário é rejeitado (401).
const authedHandler = withMcpAuth(
    handler,
    async (req): Promise<AuthInfo | undefined> => {
        // 1. Tenta pelo header Authorization
        const authHeader = req.headers.get("Authorization") || ""
        if (authHeader.startsWith(`${MCP_AUTH_SCHEME} `)) {
            const raw = authHeader.slice(`${MCP_AUTH_SCHEME} `.length).trim()
            const user = await resolveUserFromApoiaToken(raw)
            if (user) return buildAuthInfo(raw, user)
        }

        // 2. Tenta pelo query param (fallback para clientes sem suporte a headers customizados)
        const queryToken = new URL(req.url).searchParams.get(MCP_TOKEN_QUERY_PARAM)
        if (queryToken) {
            const user = await resolveUserFromApoiaToken(queryToken)
            if (user) return buildAuthInfo(queryToken, user)
        }

        return undefined
    },
    { required: true }
)

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE }
