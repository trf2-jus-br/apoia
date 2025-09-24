-- Create ia_batch_job and extend ia_batch with execution metadata

-- Extend ia_batch
ALTER TABLE ia_batch
    ADD COLUMN created_by INT NULL,
    ADD COLUMN tipo_de_sintese VARCHAR(64) NULL,
    ADD COLUMN complete BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN paused BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN concurrency SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN last_activity_at TIMESTAMP NULL;

ALTER TABLE ia_batch
    ADD CONSTRAINT fk_ia_batch_created_by FOREIGN KEY (created_by) REFERENCES ia_user(id);

-- Optional: prevent duplicate names per user
-- CREATE UNIQUE INDEX ux_ia_batch_created_by_name ON ia_batch (created_by, name);

-- New table ia_batch_job
CREATE TABLE ia_batch_job (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL,
    dossier_code VARCHAR(22) NOT NULL,
    dossier_id INT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING', -- PENDING | RUNNING | READY | ERROR
    error_msg TEXT NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    duration_ms INT NULL,
    cost_sum NUMERIC(12,6) NULL,
    CONSTRAINT fk_ia_batch_job_batch FOREIGN KEY (batch_id) REFERENCES ia_batch(id) ON DELETE CASCADE,
    CONSTRAINT fk_ia_batch_job_dossier FOREIGN KEY (dossier_id) REFERENCES ia_dossier(id) ON DELETE SET NULL
);

CREATE INDEX ix_ia_batch_job_batch_status_created ON ia_batch_job (batch_id, status, created_at);
CREATE INDEX ix_ia_batch_job_batch_code ON ia_batch_job (batch_id, dossier_code);
