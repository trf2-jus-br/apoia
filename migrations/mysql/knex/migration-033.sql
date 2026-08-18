-- Biblioteca: base_id volta a ser nullable, como em ia_prompt.
-- A 1a versao de um documento e inserida sem base_id e recebe UPDATE base_id = id
-- em seguida (o id auto_increment so existe apos o INSERT); NOT NULL quebrava o insert.
ALTER TABLE `apoia`.`ia_library` MODIFY COLUMN `base_id` INT NULL;
