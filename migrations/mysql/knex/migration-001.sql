use apoia;

CREATE TABLE ia_content_source (
    id INT NOT NULL,
    descr VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

INSERT INTO ia_content_source (id, descr) VALUES (1, 'HTML');
INSERT INTO ia_content_source (id, descr) VALUES (2, 'PDF');
INSERT INTO ia_content_source (id, descr) VALUES (3, 'PDF (OCR)');

CREATE TABLE ia_evaluation (
    id INT NOT NULL,
    descr VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

-- INSERT INTO ia_evaluation (id, descr) VALUES (1, 'Aprovado');
INSERT INTO ia_evaluation (id, descr) VALUES (2, 'Outros');
INSERT INTO ia_evaluation (id, descr) VALUES (3, 'Factualmente Incorreto');
INSERT INTO ia_evaluation (id, descr) VALUES (4, 'Estilo Insatisfatório');
INSERT INTO ia_evaluation (id, descr) VALUES (5, 'Incompleto');
INSERT INTO ia_evaluation (id, descr) VALUES (6, 'Excessivamente Longo');

CREATE TABLE ia_user (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    -- email VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (username)
);

CREATE TABLE ia_system (
    id INT NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,   
    PRIMARY KEY (id)
);

CREATE TABLE ia_model (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ia_testset (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    base_id INT NULL,
    model_id INT NULL,
    kind VARCHAR(32) NOT NULL,   
    name VARCHAR(128) NOT NULL,   
    slug VARCHAR(128) NOT NULL,
    content JSON NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_official BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (base_id) REFERENCES ia_testset (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES ia_model (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_prompt (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    base_id INT NULL,
    testset_id INT NULL,
    model_id INT NULL,
    kind VARCHAR(32) NOT NULL,   
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    content JSON NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_official BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (base_id) REFERENCES ia_prompt (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (testset_id) REFERENCES ia_testset (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES ia_model (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_test (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prompt_id INT,
    testset_id INT,
    model_id INT NULL,
    score FLOAT,
    content JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES ia_prompt(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (testset_id) REFERENCES ia_testset(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES ia_model (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_dossier (
    id INT NOT NULL AUTO_INCREMENT,
    system_id INT NOT NULL,
    code VARCHAR(22) NOT NULL,   
    class_code INT NULL,
    filing_at DATE NULL,
    created_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (system_id) REFERENCES ia_system (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_document (
    id INT NOT NULL AUTO_INCREMENT,
    dossier_id INT NOT NULL,
    content_source_id INT NULL,
    code VARCHAR(64) NOT NULL,   
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    content TEXT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (dossier_id) REFERENCES ia_dossier (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (content_source_id) REFERENCES ia_content_source (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_generation (
    id INT NOT NULL AUTO_INCREMENT,
    model VARCHAR(64) NOT NULL,
    prompt VARCHAR(64) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    generation TEXT NOT NULL,
    attempt TINYINT NULL,
    evaluation_user_id INT NULL,
    evaluation_id INT NULL,
    evaluation_descr VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT ia_generation_evaluation_user_id_fk FOREIGN KEY (evaluation_user_id) REFERENCES ia_user (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT ia_generation_evaluation_id_fk FOREIGN KEY (evaluation_id) REFERENCES ia_evaluation (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_batch (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE ia_batch_dossier (
    id INT NOT NULL AUTO_INCREMENT,
    batch_id INT NULL,
    dossier_id INT NOT NULL,
    triage VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT ia_batch_batch_id_fk FOREIGN KEY (batch_id) REFERENCES ia_batch (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT ia_batch_dossier_id_fk FOREIGN KEY (dossier_id) REFERENCES ia_dossier (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    UNIQUE (dossier_id, batch_id)
);

CREATE TABLE ia_batch_dossier_item (
    id INT NOT NULL AUTO_INCREMENT,
    batch_dossier_id INT NOT NULL,
    document_id INT NULL,
    generation_id INT NOT NULL,  
    descr VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seq INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ia_batch_batch_dossier_id_fk FOREIGN KEY (batch_dossier_id) REFERENCES ia_batch_dossier (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT ia_batch_generation_id_fk FOREIGN KEY (generation_id) REFERENCES ia_generation (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX ia_generation_sha256_prompt_model ON ia_generation (sha256, prompt, model);

CREATE TABLE ia_enum (
    id INT NOT NULL AUTO_INCREMENT,
    descr VARCHAR(127) NOT NULL,   
    PRIMARY KEY (id)
);

CREATE TABLE ia_enum_item (
    id INT NOT NULL AUTO_INCREMENT,
    enum_id INT NOT NULL,
    descr VARCHAR(255) NOT NULL,   
    hidden TINYINT NOT NULL DEFAULT 0,
    enum_item_id_main INT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (enum_id) REFERENCES ia_enum (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ia_batch_dossier_enum_item (
    id INT NOT NULL AUTO_INCREMENT,
    batch_dossier_id INT NOT NULL,
    enum_item_id INT NOT NULL,  
    PRIMARY KEY (id),
    CONSTRAINT ia_enum_item_batch_dossier_id_fk FOREIGN KEY (batch_dossier_id) REFERENCES ia_batch_dossier (id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT ia_enum_item_id_fk FOREIGN KEY (enum_item_id) REFERENCES ia_enum_item (id) ON UPDATE NO ACTION ON DELETE CASCADE
);

