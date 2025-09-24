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
