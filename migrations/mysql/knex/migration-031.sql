-- Biblioteca: compartilhamento (share), versionamento (base_id/uuid/is_latest)
-- e favoritos por uuid (padrao da migration-020 de prompts)

-- --------------------------------------------------
-- 1. ia_library: share, base_id, uuid, is_latest
-- --------------------------------------------------

-- 1a. Compartilhamento: PADRAO | PUBLICO | NAO_LISTADO | PRIVADO
ALTER TABLE `apoia`.`ia_library` ADD COLUMN `share` VARCHAR(32) NOT NULL DEFAULT 'PRIVADO';

-- 1b. Versionamento (nullable initially for backfill)
ALTER TABLE `apoia`.`ia_library` ADD COLUMN `base_id` INT NULL;
ALTER TABLE `apoia`.`ia_library` ADD COLUMN `uuid` CHAR(36) NULL;
ALTER TABLE `apoia`.`ia_library` ADD COLUMN `is_latest` TINYINT(1) NOT NULL DEFAULT 1;

-- 1c. Backfill: cada documento existente e a 1a versao de si mesmo
-- (UUID() e avaliado por linha, sem necessidade de tabela temporaria)
SET SQL_SAFE_UPDATES = 0;

UPDATE `apoia`.`ia_library` SET `base_id` = `id` WHERE `base_id` IS NULL;
UPDATE `apoia`.`ia_library` SET `uuid` = UUID() WHERE `uuid` IS NULL;

SET SQL_SAFE_UPDATES = 1;

-- 1d. Set NOT NULL constraints now that all rows have values
ALTER TABLE `apoia`.`ia_library` MODIFY COLUMN `base_id` INT NOT NULL;
ALTER TABLE `apoia`.`ia_library` MODIFY COLUMN `uuid` CHAR(36) NOT NULL;

-- 1e. Indexes (MySQL does not support partial unique indexes)
ALTER TABLE `apoia`.`ia_library` ADD INDEX `idx_ia_library_uuid` (`uuid`);
ALTER TABLE `apoia`.`ia_library` ADD INDEX `idx_ia_library_base_id` (`base_id`);

-- --------------------------------------------------
-- 2. ia_library_favorite: add library_uuid (dual-write period)
-- --------------------------------------------------

ALTER TABLE `apoia`.`ia_library_favorite` ADD COLUMN `library_uuid` CHAR(36) NULL;

SET SQL_SAFE_UPDATES = 0;

-- MySQL does not support UPDATE ... FROM, so we use UPDATE JOIN
UPDATE `apoia`.`ia_library_favorite` f
INNER JOIN `apoia`.`ia_library` l ON l.`id` = f.`library_id`
SET f.`library_uuid` = l.`uuid`;

SET SQL_SAFE_UPDATES = 1;

ALTER TABLE `apoia`.`ia_library_favorite` ADD INDEX `idx_ia_library_favorite_uuid` (`library_uuid`);
