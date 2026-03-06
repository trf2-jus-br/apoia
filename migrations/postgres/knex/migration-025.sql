-- Migration 025: Deactivate internal prompts (name starting with ^)
UPDATE ia_prompt SET is_latest = 0 WHERE name LIKE '^%' AND is_latest = 1;
