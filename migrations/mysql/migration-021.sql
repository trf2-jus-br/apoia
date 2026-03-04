-- Migration 021: Expand ia_prompt.kind column from VARCHAR(32) to VARCHAR(128)
-- Needed because sync engine stores kind as '^slug' and some slugs exceed 32 chars
-- (e.g., '^prev-apesp-pontos-controvertidos-primeira-instancia' = 53 chars)

ALTER TABLE ia_prompt MODIFY COLUMN kind VARCHAR(128) NULL;
