-- F1: Unificacao de Prompts - Novas colunas para uuid, library, workflow
-- Ref: REFACTOR-PLAN.md

-- --------------------------------------------------
-- 1. ia_prompt: uuid, library, library_version, workflow
-- --------------------------------------------------

-- 1a. Add uuid column (nullable initially for backfill)
ALTER TABLE `apoia`.`ia_prompt` ADD COLUMN `uuid` CHAR(36) NULL;

-- 1b. Populate uuid: same uuid for all rows sharing the same base_id
-- MySQL does not support UPDATE ... FROM, so we use a correlated subquery approach
-- First, create a temporary table with one uuid per base_id
CREATE TEMPORARY TABLE tmp_prompt_uuids AS
SELECT DISTINCT base_id, UUID() AS new_uuid
FROM `apoia`.`ia_prompt`
WHERE base_id IS NOT NULL;

SET SQL_SAFE_UPDATES = 0;

UPDATE `apoia`.`ia_prompt` p
INNER JOIN tmp_prompt_uuids t ON p.base_id = t.base_id
SET p.uuid = t.new_uuid
WHERE p.uuid IS NULL;

-- 1c. Rows with NULL base_id get their own uuid
UPDATE `apoia`.`ia_prompt` SET uuid = UUID() WHERE uuid IS NULL;

SET SQL_SAFE_UPDATES = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_prompt_uuids;

-- 1d. Set NOT NULL constraint
ALTER TABLE `apoia`.`ia_prompt` MODIFY COLUMN `uuid` CHAR(36) NOT NULL;

-- 1e. Index on uuid (MySQL does not support partial unique indexes)
ALTER TABLE `apoia`.`ia_prompt` ADD INDEX `idx_ia_prompt_uuid` (`uuid`);

-- 1f. Add library and library_version columns
ALTER TABLE `apoia`.`ia_prompt` ADD COLUMN `library` VARCHAR(128) NULL;
ALTER TABLE `apoia`.`ia_prompt` ADD COLUMN `library_version` VARCHAR(64) NULL;

-- 1g. Add workflow column (JSON)
ALTER TABLE `apoia`.`ia_prompt` ADD COLUMN `workflow` JSON NULL;

-- --------------------------------------------------
-- 2. ia_generation: execution_id, aggregator_prompt_id
-- --------------------------------------------------

-- 2a. execution_id groups all generations from a single workflow run
ALTER TABLE `apoia`.`ia_generation` ADD COLUMN `execution_id` CHAR(36) NULL;

-- 2b. aggregator_prompt_id points to the aggregator/workflow prompt that triggered this generation
ALTER TABLE `apoia`.`ia_generation` ADD COLUMN `aggregator_prompt_id` INT NULL;

-- 2c. Foreign key on aggregator_prompt_id
ALTER TABLE `apoia`.`ia_generation`
  ADD CONSTRAINT `fk_ia_generation_aggregator_prompt_id`
  FOREIGN KEY (`aggregator_prompt_id`) REFERENCES `apoia`.`ia_prompt` (`id`)
  ON DELETE SET NULL;

-- 2d. Indexes
ALTER TABLE `apoia`.`ia_generation` ADD INDEX `idx_ia_generation_execution_id` (`execution_id`);
ALTER TABLE `apoia`.`ia_generation` ADD INDEX `idx_ia_generation_aggregator` (`aggregator_prompt_id`);

-- --------------------------------------------------
-- 3. ia_favorite: add prompt_uuid (dual-write period)
-- --------------------------------------------------

ALTER TABLE `apoia`.`ia_favorite` ADD COLUMN `prompt_uuid` CHAR(36) NULL;

SET SQL_SAFE_UPDATES = 0;

UPDATE `apoia`.`ia_favorite` f
INNER JOIN `apoia`.`ia_prompt` p ON p.base_id = f.prompt_id AND p.is_latest = 1
SET f.prompt_uuid = p.uuid;

SET SQL_SAFE_UPDATES = 1;

ALTER TABLE `apoia`.`ia_favorite` ADD INDEX `idx_ia_favorite_prompt_uuid` (`prompt_uuid`);

-- --------------------------------------------------
-- 4. ia_prompt_rating: add prompt_uuid (dual-write period)
-- --------------------------------------------------

ALTER TABLE `apoia`.`ia_prompt_rating` ADD COLUMN `prompt_uuid` CHAR(36) NULL;

SET SQL_SAFE_UPDATES = 0;

UPDATE `apoia`.`ia_prompt_rating` r
INNER JOIN `apoia`.`ia_prompt` p ON p.base_id = r.prompt_base_id AND p.is_latest = 1
SET r.prompt_uuid = p.uuid;

SET SQL_SAFE_UPDATES = 1;

ALTER TABLE `apoia`.`ia_prompt_rating` ADD INDEX `idx_ia_prompt_rating_prompt_uuid` (`prompt_uuid`);
