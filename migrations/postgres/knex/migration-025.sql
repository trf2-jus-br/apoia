-- Migration 025: Deactivate internal prompts (name starting with ^)
UPDATE ia_prompt SET is_latest = false WHERE name LIKE '^%' AND is_latest = true;
