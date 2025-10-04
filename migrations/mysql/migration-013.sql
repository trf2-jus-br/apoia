-- Biblioteca do usuário: itens e exemplos (MySQL)
CREATE TABLE ia_library (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(20) NOT NULL COMMENT 'ARQUIVO | MODELO | MARKDOWN',
  model_subtype VARCHAR(20) DEFAULT NULL COMMENT 'PRIMEIRO_DESPACHO | SENTENCA | VOTO',
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) DEFAULT NULL,
  content_markdown TEXT DEFAULT NULL,
  content_binary LONGBLOB DEFAULT NULL,
  inclusion VARCHAR(20) DEFAULT 'NAO' COMMENT 'NAO | SIM | CONTEXTUAL',
  context VARCHAR(256) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  CONSTRAINT fk_ia_library_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT fk_ia_library_created_by FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_ia_library_user ON ia_library(user_id);

CREATE TABLE ia_library_example (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  library_id INT NOT NULL,
  process_number VARCHAR(32) NOT NULL,
  piece_type VARCHAR(32) DEFAULT NULL COMMENT 'DESPACHO_DECISAO | SENTENCA | VOTO',
  piece_id VARCHAR(128) DEFAULT NULL,
  piece_title VARCHAR(255) DEFAULT NULL,
  piece_date DATETIME DEFAULT NULL,
  event_number VARCHAR(32) DEFAULT NULL,
  content_markdown TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  CONSTRAINT fk_ia_library_example_library FOREIGN KEY (library_id) REFERENCES ia_library (id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT fk_ia_library_example_created_by FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_ia_library_example_library ON ia_library_example(library_id);
CREATE UNIQUE INDEX uk_ia_library_example_unique ON ia_library_example(library_id, process_number);
