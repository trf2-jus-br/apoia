-- Tabela de anexos de documentos da biblioteca (MySQL)
CREATE TABLE ia_library_attachment (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  library_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  word_count INT DEFAULT NULL,
  content_text MEDIUMTEXT DEFAULT NULL,
  content_binary LONGBLOB NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  CONSTRAINT fk_ia_library_attachment_library FOREIGN KEY (library_id) REFERENCES ia_library (id) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT fk_ia_library_attachment_created_by FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX idx_ia_library_attachment_library ON ia_library_attachment(library_id);
