ALTER TABLE `apoia`.`ia_prompt` 
ADD COLUMN `is_latest` TINYINT(1) NULL DEFAULT '0' AFTER `is_official`,
ADD COLUMN `share` VARCHAR(32) NULL DEFAULT 'PRIVADO' AFTER `is_latest`,
CHANGE COLUMN `kind` `kind` VARCHAR(32) NULL DEFAULT NULL,
ADD INDEX `latest` (`is_latest` ASC, `base_id` ASC, `id` ASC) VISIBLE;

ALTER TABLE `apoia`.`ia_generation` 
ADD COLUMN `created_by` INT NULL DEFAULT NULL AFTER `created_at`;

CREATE TABLE `apoia`.`ia_favorite` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `prompt_id` INT NOT NULL,
  `level` INT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `favorite_user_id_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `favorite_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `apoia`.`ia_user` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `favorite_prompt_id`
    FOREIGN KEY (`prompt_id`)
    REFERENCES `apoia`.`ia_prompt` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);
