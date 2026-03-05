-- Backfill prompt_id in ia_generation for internal prompt slugs
-- Migration-017 already backfilled 'prompt-X' format (user library prompts).
-- This migration backfills records whose prompt field is an internal slug
-- (e.g. 'analise-completa', 'ementa', 'chat') by joining with ia_prompt.kind.

-- In ia_prompt, internal prompt kinds are stored with '^' prefix (e.g. '^ementa').
-- ia_generation.prompt stores the bare slug (e.g. 'ementa').

UPDATE ia_generation g
SET prompt_id = p.id
FROM ia_prompt p
WHERE g.prompt_id IS NULL
  AND g.prompt IS NOT NULL
  AND g.prompt NOT LIKE 'prompt-%'
  AND p.kind = '^' || g.prompt
  AND p.is_latest = true;

-- Also backfill records where prompt uses underscores instead of hyphens
-- (old format: 'analise_completa' vs new: 'analise-completa')
UPDATE ia_generation g
SET prompt_id = p.id
FROM ia_prompt p
WHERE g.prompt_id IS NULL
  AND g.prompt IS NOT NULL
  AND g.prompt NOT LIKE 'prompt-%'
  AND p.kind = '^' || REPLACE(g.prompt, '_', '-')
  AND p.is_latest = true;
