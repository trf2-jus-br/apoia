-- Tabela para armazenar preferências de modelo/chaves de API por usuário
CREATE TABLE `apoia`.`ia_user_prefs` (
  user_id INT NOT NULL,
  model VARCHAR(128) NOT NULL DEFAULT '',
  use_model_in_all_situations BOOLEAN NOT NULL DEFAULT FALSE,
  env_encrypted MEDIUMTEXT NULL,
  anonymize BOOLEAN NOT NULL DEFAULT TRUE,
  anonymize_until DATETIME NULL,
  beta_tester BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_prefs_user FOREIGN KEY (user_id) REFERENCES `apoia`.`ia_user` (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id)
);
