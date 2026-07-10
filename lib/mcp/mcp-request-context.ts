import { AsyncLocalStorage } from 'node:async_hooks'
import type { UserType } from '../user'

// Guarda o UserType resolvido pelo verifyToken durante o ciclo de vida de uma request MCP.
// Lido no execute das tools (registerApoiaTools) e em getCurrentUser() quando o fluxo MCP
// está ativo. Independente da propagação interna req.auth -> extra.authInfo do
// mcp-handler/SDK, que se mostrou instável entre versões.
//
// Como o mcp-handler opera em modo stateless (cada POST cria um McpServer novo e processa
// auth -> registerTools -> execute numa única cadeia async), o contexto é populado no wrapper
// do handler e lido no execute da tool dentro da mesma cadeia.
//
// Usa `import type` para UserType: assim este módulo NÃO gera dependência de runtime para
// ../user, evitando cycle (user.ts importa este módulo estaticamente). O tipo é apagado em
// tempo de compilação.
export const mcpRequestContext = new AsyncLocalStorage<UserType>()
