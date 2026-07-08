// Constantes compartilhadas entre a rota MCP (app/api/v1/mcp/[transport]/route.ts) e o
// gerador de configuração (lib/mcp/mcp-config.ts). Centralizadas aqui para evitar acoplamento
// direto entre route handler e server action, e para garantir consistência do scheme de auth.

// Scheme do header Authorization usado pelo servidor MCP ("Apoia-MCP <token_id>").
// Alternativa ao query param para clientes que suportam headers customizados.
export const MCP_AUTH_SCHEME = "Apoia-MCP"

// Nome do query param que carrega o token_id na URL (?token=<token_id>).
export const MCP_TOKEN_QUERY_PARAM = "token"
