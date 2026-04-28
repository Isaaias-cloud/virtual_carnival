-- =====================================================
-- Virtual Carnival - Database schema
-- MySQL 8.0+
-- =====================================================

DROP DATABASE IF EXISTS virtual_carnival;
CREATE DATABASE virtual_carnival CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE virtual_carnival;

-- ---------- PLAYERS ----------
CREATE TABLE players (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(40)  NOT NULL UNIQUE,
    photo_path      VARCHAR(255) DEFAULT '/images/default_avatar.svg',
    games_won       INT          NOT NULL DEFAULT 0,
    total_plays     INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- GAMES ----------
CREATE TABLE games (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(30)  NOT NULL UNIQUE, -- e.g. 'ducks', 'darts'
    name            VARCHAR(80)  NOT NULL,
    description     TEXT,
    image_path      VARCHAR(255),
    music_path      VARCHAR(255),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- PLAYER <-> GAME (many-to-many) ----------
CREATE TABLE player_games (
    player_id       INT NOT NULL,
    game_id         INT NOT NULL,
    max_score       INT NOT NULL DEFAULT 0,
    last_score      INT NOT NULL DEFAULT 0,
    times_won       INT NOT NULL DEFAULT 0,
    last_played_at  TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (player_id, game_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- SCORE HISTORY (audit log) ----------
CREATE TABLE score_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id       INT NOT NULL,
    game_id         INT NOT NULL,
    score           INT NOT NULL,
    won             BOOLEAN NOT NULL DEFAULT FALSE,
    played_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
    INDEX idx_player_game (player_id, game_id),
    INDEX idx_played (played_at)
) ENGINE=InnoDB;

-- =====================================================
-- TRIGGER: keep max_score in sync when last_score is updated
-- =====================================================
DELIMITER //
CREATE TRIGGER trg_player_games_maxscore
BEFORE UPDATE ON player_games
FOR EACH ROW
BEGIN
    IF NEW.last_score > OLD.max_score THEN
        SET NEW.max_score = NEW.last_score;
    ELSE
        SET NEW.max_score = OLD.max_score;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- PROCEDURE: register a play (last_score / history / total_plays)
-- =====================================================
DELIMITER //
CREATE PROCEDURE register_play(
    IN p_player_id INT,
    IN p_game_id   INT,
    IN p_score     INT,
    IN p_won       BOOLEAN
)
BEGIN
    -- ensure relation exists
    INSERT INTO player_games (player_id, game_id, last_score, max_score, last_played_at)
    VALUES (p_player_id, p_game_id, p_score, p_score, NOW())
    ON DUPLICATE KEY UPDATE
        last_score = p_score,
        last_played_at = NOW();

    -- audit
    INSERT INTO score_history (player_id, game_id, score, won)
    VALUES (p_player_id, p_game_id, p_score, p_won);

    -- bump total plays
    UPDATE players SET total_plays = total_plays + 1 WHERE id = p_player_id;

    -- award medal if won
    IF p_won = TRUE THEN
        UPDATE player_games
            SET times_won = times_won + 1
            WHERE player_id = p_player_id AND game_id = p_game_id;
        UPDATE players
            SET games_won = games_won + 1
            WHERE id = p_player_id;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- PROCEDURE: reset a player's scores
-- =====================================================
DELIMITER //
CREATE PROCEDURE reset_player_scores(IN p_player_id INT)
BEGIN
    UPDATE player_games
        SET max_score = 0, last_score = 0, times_won = 0
        WHERE player_id = p_player_id;
    UPDATE players SET games_won = 0 WHERE id = p_player_id;
END//
DELIMITER ;


select * from players;