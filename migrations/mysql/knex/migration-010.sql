ALTER TABLE apoia.ia_generation
    ADD COLUMN dossier_id INTEGER NULL,
    ADD COLUMN document_id INTEGER NULL,
    ADD COLUMN prompt_payload TEXT NULL,
    ADD COLUMN cached_input_tokens INTEGER NULL,
    ADD COLUMN input_tokens INTEGER NULL,
    ADD COLUMN output_tokens INTEGER NULL,
    ADD COLUMN reasoning_tokens INTEGER NULL,
    ADD COLUMN approximate_cost NUMERIC(12,6) NULL;

ALTER TABLE apoia.ia_generation
    ADD CONSTRAINT fk_dossier_id FOREIGN KEY (dossier_id) REFERENCES apoia.ia_dossier(id);

ALTER TABLE apoia.ia_generation
    ADD CONSTRAINT fk_document_id FOREIGN KEY (document_id) REFERENCES apoia.ia_document(id);
