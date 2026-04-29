-- Migration 023: Schema cleanup
-- 1. Move workflow data into content JSONB column
-- 2. Drop workflow column
-- 3. Rename kind → category (nullable)
-- 4. Set all category to NULL (arena not in use, library prompts use slug for lookups)

-- 1. Move workflow into content (content is json, so cast to jsonb, merge, cast back)
-- UPDATE ia_prompt
-- SET content = (content::jsonb || jsonb_build_object('workflow', workflow::jsonb))::json
-- WHERE workflow IS NOT NULL;

-- 2. Drop workflow column
ALTER TABLE ia_prompt DROP COLUMN workflow;

-- 3. Rename kind to category
ALTER TABLE ia_prompt RENAME COLUMN kind TO category;

-- 4. Set all category to NULL
UPDATE ia_prompt SET category = NULL;

-- 5. Make category nullable (it was NOT NULL before)
ALTER TABLE ia_prompt ALTER COLUMN category DROP NOT NULL;
