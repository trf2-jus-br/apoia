-- Tabela de cache de tribunais (MySQL)
-- Armazena informações dos tribunais obtidas do webservice corporativo-proxy
CREATE TABLE `apoia`.`ia_court` (
  `id` INT NOT NULL PRIMARY KEY,              -- court_id (seq_orgao do webservice)
  `sigla` VARCHAR(32) NOT NULL,               -- Ex: "TRF2", "JFRJ", "STF"
  `nome` VARCHAR(256) NOT NULL,               -- Nome completo do tribunal
  `tipo` VARCHAR(64) NULL,                    -- Tipo do órgão (tribunal, vara, etc.)
  `seq_tribunal_pai` INT NULL,                -- ID do tribunal pai (para varas/seções)
  `uf` VARCHAR(2) NULL,                       -- UF do tribunal
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ia_court_sigla` (`sigla`),
  INDEX `idx_ia_court_tribunal_pai` (`seq_tribunal_pai`)
) ENGINE = InnoDB;
