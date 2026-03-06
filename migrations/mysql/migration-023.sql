-- Migration 023: Schema cleanup
-- 1. Move workflow data into content JSON column
-- 2. Drop workflow column
-- 3. Rename kind → category (nullable)
-- 4. Set all category to NULL

-- 1. Move workflow into content (merge JSON objects)
UPDATE `apoia`.`ia_prompt`
SET content = JSON_MERGE_PATCH(content, JSON_OBJECT('workflow', CAST(workflow AS JSON)))
WHERE workflow IS NOT NULL;

-- 2. Drop workflow column
ALTER TABLE `apoia`.`ia_prompt` DROP COLUMN `workflow`;

-- 3. Rename kind to category
ALTER TABLE `apoia`.`ia_prompt` CHANGE COLUMN `kind` `category` VARCHAR(128) NULL;

-- 4. Set all category to NULL
UPDATE `apoia`.`ia_prompt` SET `category` = NULL;
