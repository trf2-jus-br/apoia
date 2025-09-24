CREATE TABLE IF NOT EXISTS apoia.ia_batch_index_map (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  descr_from VARCHAR(512) NOT NULL,
  descr_to VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ia_batch_index_map_batch FOREIGN KEY (batch_id) REFERENCES apoia.ia_batch(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX uk_index_map_batch_from_to ON apoia.ia_batch_index_map (batch_id, descr_from, descr_to);
CREATE INDEX ix_index_map_batch ON apoia.ia_batch_index_map (batch_id);

-- Add prompt_base_id to ia_batch (MySQL)
ALTER TABLE `apoia`.`ia_batch`
  ADD COLUMN `prompt_base_id` INT NULL AFTER `tipo_de_sintese`,
  ADD CONSTRAINT `fk_ia_batch_prompt_base` FOREIGN KEY (`prompt_base_id`) REFERENCES `apoia`.`ia_prompt`(`id`) ON DELETE SET NULL;

CREATE INDEX `ix_ia_batch_prompt_base` ON `apoia`.`ia_batch` (`prompt_base_id`);
