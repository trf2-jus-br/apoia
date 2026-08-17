-- Biblioteca: compartilhamento (share), versionamento (base_id/uuid/is_latest)
-- e favoritos por uuid (padrao da migration-020 de prompts)

--------------------------------------------------
-- 1. ia_library: share, base_id, uuid, is_latest
--------------------------------------------------

-- 1a. Compartilhamento: PADRAO | PUBLICO | NAO_LISTADO | PRIVADO
ALTER TABLE ia_library ADD COLUMN share VARCHAR(32) NOT NULL DEFAULT 'PRIVADO';

-- 1b. Versionamento (nullable initially for backfill)
ALTER TABLE ia_library ADD COLUMN base_id INT NULL;
ALTER TABLE ia_library ADD COLUMN uuid UUID NULL;
ALTER TABLE ia_library ADD COLUMN is_latest BOOLEAN NOT NULL DEFAULT TRUE;

-- 1c. Backfill: cada documento existente e a 1a versao de si mesmo
UPDATE ia_library SET base_id = id WHERE base_id IS NULL;
UPDATE ia_library SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- 1d. Set NOT NULL constraints now that all rows have values
ALTER TABLE ia_library ALTER COLUMN base_id SET NOT NULL;
ALTER TABLE ia_library ALTER COLUMN uuid SET NOT NULL;

-- 1e. Partial unique index: only one row per uuid where is_latest = true
CREATE UNIQUE INDEX uk_ia_library_uuid_latest ON ia_library (uuid) WHERE is_latest = true;

-- 1f. General indexes (uuid for lookups across all versions, base_id for delete/update de versoes)
CREATE INDEX idx_ia_library_uuid ON ia_library (uuid);
CREATE INDEX idx_ia_library_base_id ON ia_library (base_id);

--------------------------------------------------
-- 2. ia_library_favorite: add library_uuid (dual-write period)
--------------------------------------------------

ALTER TABLE ia_library_favorite ADD COLUMN library_uuid UUID NULL;

-- Backfill from existing library_id -> ia_library.uuid
UPDATE ia_library_favorite f
SET library_uuid = l.uuid
FROM ia_library l
WHERE l.id = f.library_id;

CREATE INDEX idx_ia_library_favorite_uuid ON ia_library_favorite (library_uuid);
