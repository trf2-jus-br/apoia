-- Create table for prompt ratings
CREATE TABLE `apoia`.`ia_prompt_rating` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `prompt_base_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `stars` INT NOT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_prompt_user` (`prompt_base_id` ASC, `user_id` ASC),
  INDEX `fk_ia_prompt_rating_user_id_idx` (`user_id` ASC),
  CONSTRAINT `fk_ia_prompt_rating_prompt_id`
    FOREIGN KEY (`prompt_base_id`)
    REFERENCES `apoia`.`ia_prompt` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_ia_prompt_rating_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `apoia`.`ia_user` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `chk_stars_range` CHECK (`stars` >= 1 AND `stars` <= 5)
) ENGINE = InnoDB;
