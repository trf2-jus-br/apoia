-- Biblioteca: campo author dedicado (em prompts o autor fica dentro do JSON content)
ALTER TABLE `apoia`.`ia_library` ADD COLUMN `author` VARCHAR(64) NULL;
