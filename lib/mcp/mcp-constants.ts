// Constantes compartilhadas entre a rota MCP (app/api/v1/mcp/[transport]/route.ts) e o
// gerador de configuração (lib/ai/mcp-config.ts). Centralizadas aqui para evitar acoplamento
// direto entre route handler e server action, e para garantir consistência do scheme de auth.

// Prefixo que identifica um token MCP do apoia (o token encriptado passa a ser "apoia-<base64>").
// O servidor só decifra tokens que comecem com este prefixo; tokens sem ele são rejeitados.
export const MCP_TOKEN_PREFIX = "apoia-"

// Scheme do header Authorization usado pelo servidor MCP ("Apoia-MCP <token>").
// Alternativa ao query param para clientes que suportam headers customizados.
export const MCP_AUTH_SCHEME = "Apoia-MCP"

// Nome do query param que carrega o token na URL (?token=apoia-...).
export const MCP_TOKEN_QUERY_PARAM = "token"
