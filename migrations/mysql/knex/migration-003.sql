use apoia;

INSERT INTO ia_model VALUES 
    (5,'llama-3.2-90b-text-preview','2024-10-22 14:30:21');

ALTER TABLE `apoia`.`ia_document` 
ADD COLUMN `assigned_category` VARCHAR(64) NULL DEFAULT NULL AFTER `content_source_id`,
ADD COLUMN `predicted_category` VARCHAR(64) NULL DEFAULT NULL AFTER `assigned_category`,
CHANGE COLUMN `code` `code` VARCHAR(64) NOT NULL AFTER `dossier_id`;
