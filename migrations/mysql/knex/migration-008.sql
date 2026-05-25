ALTER TABLE `apoia`.`ia_user` 
ADD COLUMN `name` VARCHAR(256) NULL AFTER `created_at`,
ADD COLUMN `cpf` VARCHAR(11) NULL AFTER `name`,
ADD COLUMN `email` VARCHAR(64) NULL AFTER `cpf`,
ADD COLUMN `unit_id` INT NULL AFTER `email`,
ADD COLUMN `unit_name` VARCHAR(256) NULL AFTER `unit_id`,
ADD COLUMN `court_id` INT NULL AFTER `unit_name`,
ADD COLUMN `court_name` VARCHAR(256) NULL AFTER `court_id`,
ADD COLUMN `state_abbreviation` VARCHAR(2) NULL AFTER `court_name`;

CREATE TABLE `apoia`.`ia_user_daily_usage` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `usage_date` DATE NOT NULL,
    `user_id` INT NULL, -- Se NULL, esta linha representa um total para o tribunal. Chave estrangeira para ia_user.id.
    `court_id` INT NOT NULL, -- Identifica o tribunal para o qual o uso é registrado. Chave estrangeira para uma tabela de tribunais.
    -- Coluna auxiliar para a restrição UNIQUE: mapeia user_id NULL (total do tribunal) para um valor distinto (ex: -1).
    -- Assume que -1 não é um user_id válido de `ia_user`.`id`.
    `_internal_user_id_key` INT AS (IFNULL(`user_id`, -1)) STORED,
    `usage_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `input_tokens_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `output_tokens_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `approximate_cost` DECIMAL(12, 6) NOT NULL DEFAULT 0.000000,
    INDEX `fk_ia_user_daily_usage_user_id_idx` (`user_id` ASC) VISIBLE,
    PRIMARY KEY (`id`),
    -- Esta chave única garante:
    -- 1. Para uma dada usage_date e court_id, apenas uma entrada por user_id (uso específico do usuário).
    -- 2. Para uma dada usage_date e court_id, apenas uma entrada onde user_id É NULL (uso total do tribunal, mapeado para _internal_user_id_key = -1).
    UNIQUE KEY `uk_date_court_user` (`usage_date`, `court_id`, `_internal_user_id_key`)
);

ALTER TABLE `apoia`.`ia_user_daily_usage` 
ADD CONSTRAINT `fk_ia_user_daily_usage_user_id`
  FOREIGN KEY (`user_id`)
  REFERENCES `apoia`.`ia_user` (`id`)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
