-- Tabela para armazenar tokens MCP por usuário (ID curto + JWT PDPJ encriptado + expiração)
CREATE TABLE ia_mcp_token (
  user_id INT NOT NULL,
  token_id VARCHAR(64) NOT NULL,
  token_ciphertext TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mcp_token_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id)
);
CREATE UNIQUE INDEX idx_ia_mcp_token_token_id ON ia_mcp_token (token_id);
