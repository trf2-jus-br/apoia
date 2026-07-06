-- Tabela para armazenar preferências de modelo/chaves de API por usuário (PostgreSQL)
CREATE TABLE ia_user_prefs (
  user_id INT NOT NULL,
  model VARCHAR(128) NOT NULL DEFAULT '',
  use_model_in_all_situations BOOLEAN NOT NULL DEFAULT FALSE,
  env_encrypted TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_prefs_user FOREIGN KEY (user_id) REFERENCES ia_user (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id)
);
