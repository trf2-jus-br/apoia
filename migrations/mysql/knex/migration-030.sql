-- Sistema de chamados (help desk): tabela ia_ticket (MySQL)
-- PK em UUID gerada pela aplicacao (crypto.randomUUID); o UUID funciona como protocolo do chamado.
CREATE TABLE `apoia`.`ia_ticket` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `username` VARCHAR(100) DEFAULT NULL COMMENT 'preferred_username (snapshot)',
  `user_name` VARCHAR(255) DEFAULT NULL COMMENT 'snapshot',
  `user_email` VARCHAR(255) DEFAULT NULL COMMENT 'snapshot',
  `system` VARCHAR(20) DEFAULT NULL COMMENT 'PDPJ, etc. (snapshot)',
  `court_id` INT DEFAULT NULL COMMENT 'seq_tribunal_pai no momento da abertura',
  `kind` VARCHAR(20) NOT NULL DEFAULT 'ERRO' COMMENT 'ERRO | DUVIDA | SUGESTAO',
  `message` TEXT NOT NULL,
  `error_context` TEXT DEFAULT NULL COMMENT 'stack criptografada (Cryptr) vinda do ErrorSpan',
  `page_url` VARCHAR(512) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `screenshot` LONGBLOB DEFAULT NULL,
  `screenshot_content_type` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ABERTO' COMMENT 'ABERTO | EM_ANALISE | RESOLVIDO',
  `response` TEXT DEFAULT NULL COMMENT 'resposta do moderador',
  `responded_by` VARCHAR(100) DEFAULT NULL COMMENT 'preferred_username do moderador',
  `responded_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_ia_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `apoia`.`ia_user` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX `idx_ia_ticket_status` ON `apoia`.`ia_ticket`(`status`);
CREATE INDEX `idx_ia_ticket_user` ON `apoia`.`ia_ticket`(`user_id`);
CREATE INDEX `idx_ia_ticket_created_at` ON `apoia`.`ia_ticket`(`created_at`);
