-- Migration 024: Rename library → origin (avoids confusion with ia_library)
ALTER TABLE ia_prompt RENAME COLUMN library TO origin;
ALTER TABLE ia_prompt RENAME COLUMN library_version TO origin_version;
