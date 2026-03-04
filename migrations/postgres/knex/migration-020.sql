-- F1: Unificacao de Prompts - Novas colunas para uuid, library, workflow
-- Ref: REFACTOR-PLAN.md

--------------------------------------------------
-- 1. ia_prompt: uuid, library, library_version, workflow
--------------------------------------------------

-- 1a. Add uuid column (nullable initially for backfill)
ALTER TABLE ia_prompt ADD COLUMN uuid UUID NULL;

-- 1b. Populate uuid for existing rows: same uuid for all rows sharing the same base_id
WITH distinct_bases AS (
  SELECT DISTINCT base_id, gen_random_uuid() AS new_uuid
  FROM ia_prompt
  WHERE base_id IS NOT NULL
)
UPDATE ia_prompt p
SET uuid = db.new_uuid
FROM distinct_bases db
WHERE p.base_id = db.base_id
  AND p.uuid IS NULL;

-- 1c. Rows with NULL base_id get their own uuid
UPDATE ia_prompt SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- 1d. Set NOT NULL constraint now that all rows have a value
ALTER TABLE ia_prompt ALTER COLUMN uuid SET NOT NULL;

-- 1e. Partial unique index: only one row per uuid where is_latest = 1
CREATE UNIQUE INDEX uk_ia_prompt_uuid_latest ON ia_prompt (uuid) WHERE is_latest = true;

-- 1f. General index on uuid (for lookups across all versions)
CREATE INDEX idx_ia_prompt_uuid ON ia_prompt (uuid);

-- 1g. Add library and library_version columns
ALTER TABLE ia_prompt ADD COLUMN library VARCHAR(128) NULL;
ALTER TABLE ia_prompt ADD COLUMN library_version VARCHAR(64) NULL;

-- 1h. Add workflow column (JSONB for predecessors/successors)
ALTER TABLE ia_prompt ADD COLUMN workflow JSONB NULL;

--------------------------------------------------
-- 2. ia_generation: execution_id, aggregator_prompt_id
--------------------------------------------------

-- 2a. execution_id groups all generations from a single workflow run
ALTER TABLE ia_generation ADD COLUMN execution_id UUID NULL;

-- 2b. aggregator_prompt_id points to the aggregator/workflow prompt that triggered this generation
ALTER TABLE ia_generation ADD COLUMN aggregator_prompt_id INT NULL;

-- 2c. Foreign key on aggregator_prompt_id
ALTER TABLE ia_generation
  ADD CONSTRAINT fk_ia_generation_aggregator_prompt_id
  FOREIGN KEY (aggregator_prompt_id) REFERENCES ia_prompt(id) ON DELETE SET NULL;

-- 2d. Indexes
CREATE INDEX idx_ia_generation_execution_id ON ia_generation (execution_id);
CREATE INDEX idx_ia_generation_aggregator ON ia_generation (aggregator_prompt_id);

--------------------------------------------------
-- 3. ia_favorite: add prompt_uuid (dual-write period)
--------------------------------------------------

ALTER TABLE ia_favorite ADD COLUMN prompt_uuid UUID NULL;

-- Backfill from existing prompt_id (which stores base_id) -> ia_prompt.uuid
UPDATE ia_favorite f
SET prompt_uuid = p.uuid
FROM ia_prompt p
WHERE p.base_id = f.prompt_id
  AND p.is_latest = true;

CREATE INDEX idx_ia_favorite_prompt_uuid ON ia_favorite (prompt_uuid);

--------------------------------------------------
-- 4. ia_prompt_rating: add prompt_uuid (dual-write period)
--------------------------------------------------

ALTER TABLE ia_prompt_rating ADD COLUMN prompt_uuid UUID NULL;

-- Backfill from existing prompt_base_id (which stores base_id) -> ia_prompt.uuid
UPDATE ia_prompt_rating r
SET prompt_uuid = p.uuid
FROM ia_prompt p
WHERE p.base_id = r.prompt_base_id
  AND p.is_latest = true;

CREATE INDEX idx_ia_prompt_rating_prompt_uuid ON ia_prompt_rating (prompt_uuid);
