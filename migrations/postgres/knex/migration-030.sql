-- Sistema de chamados (help desk): tabela ia_ticket (PostgreSQL)
-- PK em UUID gerada pela aplicacao (crypto.randomUUID); o UUID funciona como protocolo do chamado.
CREATE TABLE ia_ticket (
  id UUID PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(100) NULL, -- preferred_username (snapshot)
  user_name VARCHAR(255) NULL, -- snapshot
  user_email VARCHAR(255) NULL, -- snapshot
  system VARCHAR(20) NULL, -- PDPJ, etc. (snapshot)
  court_id INT NULL, -- seq_tribunal_pai no momento da abertura
  kind VARCHAR(20) NOT NULL DEFAULT 'ERRO', -- ERRO | DUVIDA | SUGESTAO
  message TEXT NOT NULL, -- descricao do problema pelo usuario
  error_context TEXT NULL, -- stack criptografada (Cryptr) vinda do ErrorSpan
  page_url VARCHAR(512) NULL,
  user_agent VARCHAR(512) NULL,
  screenshot BYTEA NULL,
  screenshot_content_type VARCHAR(50) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ABERTO', -- ABERTO | EM_ANALISE | RESOLVIDO
  response TEXT NULL, -- resposta do moderador
  responded_by VARCHAR(100) NULL, -- preferred_username do moderador
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_ia_ticket_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX idx_ia_ticket_status ON ia_ticket(status);
CREATE INDEX idx_ia_ticket_user ON ia_ticket(user_id);
CREATE INDEX idx_ia_ticket_created_at ON ia_ticket(created_at);
