-- Biblioteca: base_id volta a ser nullable, como em ia_prompt.
-- A 1a versao de um documento e inserida sem base_id e recebe UPDATE base_id = id
-- em seguida (o id serial so existe apos o INSERT); NOT NULL quebrava o insert.
ALTER TABLE ia_library ALTER COLUMN base_id DROP NOT NULL;
