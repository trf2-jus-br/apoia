-- Tabela para favoritar itens da biblioteca de outros usuários
CREATE TABLE ia_library_favorite (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  library_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lib_fav_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_lib_fav_library FOREIGN KEY (library_id) REFERENCES ia_library (id) ON DELETE CASCADE,
  UNIQUE KEY uk_lib_fav (user_id, library_id)
);
