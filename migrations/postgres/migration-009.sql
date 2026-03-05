-- Migration 009: Remove status from content, set share=BETA_TESTE for em_desenvolvimento prompts
-- Part of the status→share refactoring (BETA_TESTE share level)

-- Convert origin-synced prompts that had status=em_desenvolvimento to share=BETA_TESTE
UPDATE ia_prompt
SET share = 'BETA_TESTE'
WHERE content::text LIKE '%"status"%'
  AND content->>'status' = 'em_desenvolvimento'
  AND origin IS NOT NULL;

-- Remove the status field from content JSON for all prompts
UPDATE ia_prompt
SET content = content::jsonb - 'status'
WHERE content::text LIKE '%"status"%';
