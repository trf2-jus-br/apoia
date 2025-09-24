CREATE TABLE IF NOT EXISTS ia_batch_index_map (
  id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL,
  descr_from VARCHAR(512) NOT NULL,
  descr_to VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ia_batch_index_map_batch FOREIGN KEY (batch_id) REFERENCES ia_batch(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_index_map_batch_from_to ON ia_batch_index_map (batch_id, descr_from, descr_to);
CREATE INDEX IF NOT EXISTS ix_index_map_batch ON ia_batch_index_map (batch_id);

-- Add prompt_base_id column to ia_batch (if not already added in previous migrations)
ALTER TABLE ia_batch
  ADD COLUMN IF NOT EXISTS prompt_base_id INT NULL;

ALTER TABLE ia_batch
  ADD CONSTRAINT fk_ia_batch_prompt_base FOREIGN KEY (prompt_base_id) REFERENCES ia_prompt(id) ON DELETE SET NULL;

-- Index to speed lookups by prompt_base_id
CREATE INDEX IF NOT EXISTS ix_ia_batch_prompt_base ON ia_batch (prompt_base_id);
