-- Coluna "mode" para diferenciar prompts e preferências por modo de operação
-- (JUDICIAL ou ADMINISTRATIVO). Em ia_prompt, NULL = visível em ambos os modos.
-- Prompts existentes são marcados como 'JUDICIAL'; em ia_user_prefs a coluna é
-- NOT NULL com default 'JUDICIAL'.

ALTER TABLE `apoia`.`ia_prompt` ADD COLUMN mode VARCHAR(20) NULL;
UPDATE `apoia`.`ia_prompt` SET mode = 'JUDICIAL' WHERE mode IS NULL;

ALTER TABLE `apoia`.`ia_user_prefs` ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'JUDICIAL';
