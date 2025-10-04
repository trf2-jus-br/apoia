-- Biblioteca do usuário: itens e exemplos (PostgreSQL)
CREATE TABLE ia_library (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(20) NOT NULL, -- ARQUIVO | MODELO | MARKDOWN
  model_subtype VARCHAR(20) NULL, -- PRIMEIRO_DESPACHO | SENTENCA | VOTO
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) NULL,
  content_markdown TEXT NULL,
  content_binary BYTEA NULL,
  inclusion VARCHAR(20) DEFAULT 'NAO', -- NAO | SIM | CONTEXTUAL
  context VARCHAR(256) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  CONSTRAINT fk_ia_library_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT fk_ia_library_created_by FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX idx_ia_library_user ON ia_library(user_id);

CREATE TABLE ia_library_example (
  id SERIAL PRIMARY KEY,
  library_id INT NOT NULL,
  process_number VARCHAR(32) NOT NULL,
  piece_type VARCHAR(32) NULL, -- DESPACHO_DECISAO | SENTENCA | VOTO
  piece_id VARCHAR(128) NULL,
  piece_title VARCHAR(255) NULL,
  piece_date TIMESTAMP NULL,
  event_number VARCHAR(32) NULL,
  content_markdown TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  CONSTRAINT fk_ia_library_example_library FOREIGN KEY (library_id) REFERENCES ia_library (id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT fk_ia_library_example_created_by FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX idx_ia_library_example_library ON ia_library_example(library_id);
CREATE UNIQUE INDEX uk_ia_library_example_unique ON ia_library_example(library_id, process_number);
