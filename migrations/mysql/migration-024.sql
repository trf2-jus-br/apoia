-- Migration 024: Rename library → origin (avoids confusion with ia_library)
ALTER TABLE `apoia`.`ia_prompt` CHANGE COLUMN `library` `origin` VARCHAR(128) NULL;
ALTER TABLE `apoia`.`ia_prompt` CHANGE COLUMN `library_version` `origin_version` VARCHAR(64) NULL;
