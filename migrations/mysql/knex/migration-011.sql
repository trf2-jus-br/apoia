-- Extend ia_batch (MySQL variant of Postgres migration-011)
ALTER TABLE apoia.ia_batch
  ADD COLUMN created_by INT NULL,
  ADD COLUMN tipo_de_sintese VARCHAR(64) NULL,
  ADD COLUMN complete BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN paused BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN concurrency SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN last_activity_at TIMESTAMP NULL;

ALTER TABLE apoia.ia_batch
  ADD CONSTRAINT fk_ia_batch_created_by FOREIGN KEY (created_by) REFERENCES apoia.ia_user(id);

-- New table ia_batch_job (MySQL)
CREATE TABLE IF NOT EXISTS apoia.ia_batch_job (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  cost_sum DECIMAL(12,6) NULL,
  CONSTRAINT fk_ia_batch_job_batch FOREIGN KEY (batch_id) REFERENCES apoia.ia_batch(id) ON DELETE CASCADE,
  CONSTRAINT fk_ia_batch_job_dossier FOREIGN KEY (dossier_id) REFERENCES apoia.ia_dossier(id) ON DELETE SET NULL
);

CREATE INDEX ix_ia_batch_job_batch_status_created ON apoia.ia_batch_job (batch_id, status, created_at);
CREATE INDEX ix_ia_batch_job_batch_code ON apoia.ia_batch_job (batch_id, dossier_code);
