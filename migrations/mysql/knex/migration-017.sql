-- Add prompt_id column to ia_generation table
-- This column will store the numeric ID extracted from the prompt field when it's in the format 'prompt-X'

-- Step 1: Add the new column as nullable
ALTER TABLE `apoia`.`ia_generation`
ADD COLUMN `prompt_id` INT NULL;

-- Step 2: Populate prompt_id from existing prompt values
-- Extract the numeric ID from prompt field when it matches 'prompt-X' pattern
-- and verify that the ID exists in ia_prompt table
-- Temporarily disable safe update mode for this operation
SET SQL_SAFE_UPDATES = 0;

UPDATE `apoia`.`ia_generation` g
SET g.`prompt_id` = CAST(SUBSTRING(g.`prompt`, 8) AS UNSIGNED)
WHERE g.`prompt` REGEXP '^prompt-[0-9]+$'
  AND CAST(SUBSTRING(g.`prompt`, 8) AS UNSIGNED) IN (SELECT id FROM `apoia`.`ia_prompt`);

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Step 3: Add index for better query performance
ALTER TABLE `apoia`.`ia_generation`
ADD INDEX `idx_ia_generation_prompt_id` (`prompt_id`);

-- Step 4: Add foreign key constraint
ALTER TABLE `apoia`.`ia_generation`
ADD CONSTRAINT `ia_generation_prompt_id_fk` 
  FOREIGN KEY (`prompt_id`) 
  REFERENCES `apoia`.`ia_prompt` (`id`) 
  ON UPDATE NO ACTION 
  ON DELETE SET NULL;
