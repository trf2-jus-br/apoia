
ALTER TABLE ia_generation
    ADD COLUMN dossier_id INTEGER NULL,
    ADD COLUMN document_id INTEGER NULL,
    ADD COLUMN prompt_payload TEXT NULL,
    ADD COLUMN cachedInputTokens INTEGER NULL,
    ADD COLUMN inputTokens INTEGER NULL,
    ADD COLUMN outputTokens INTEGER NULL,
    ADD COLUMN reasoningTokens INTEGER NULL,
    ADD COLUMN approximate_cost NUMERIC(12,6) NULL;

ALTER TABLE ia_generation
    ADD CONSTRAINT fk_dossier_id FOREIGN KEY (dossier_id) REFERENCES ia_dossier(id);

ALTER TABLE ia_generation
    ADD CONSTRAINT fk_document_id FOREIGN KEY (document_id) REFERENCES ia_document(id);
