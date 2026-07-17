-- Remove a coluna "mode" de ia_user_prefs: o modo de operação (JUDICIAL ou
-- ADMINISTRATIVO) deixou de ser uma preferência persistida e passou a ser
-- derivado da URL (prefixo "/adm", injetado no header x-apoia-mode pelo proxy).
-- A coluna ia_prompt.mode NÃO é afetada: ela categoriza prompts por modo.

ALTER TABLE ia_user_prefs DROP COLUMN mode;
