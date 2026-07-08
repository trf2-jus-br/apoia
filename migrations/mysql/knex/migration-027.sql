-- Tabela para armazenar tokens MCP por usuário (ID curto + JWT PDPJ encriptado + expiração)
CREATE TABLE `apoia`.`ia_mcp_token` (
  user_id INT NOT NULL,
  token_id VARCHAR(64) NOT NULL,
  token_ciphertext MEDIUMTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mcp_token_user FOREIGN KEY (user_id) REFERENCES `apoia`.`ia_user` (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id),
  UNIQUE INDEX idx_ia_mcp_token_token_id (token_id)
) ENGINE = InnoDB;
