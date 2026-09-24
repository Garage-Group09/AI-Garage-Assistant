-- Additive update for an EXISTING database. Back up first.
-- Uses the currently selected database; never drops tables or changes old rows.

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'chat_history' AND column_name = 'session_id');
SET @ddl = IF(@present = 0, 'ALTER TABLE `chat_history` ADD COLUMN `session_id` VARCHAR(64) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'chat_history' AND column_name = 'metadata_json');
SET @ddl = IF(@present = 0, 'ALTER TABLE `chat_history` ADD COLUMN `metadata_json` TEXT NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'diagnosis' AND column_name = 'response_type');
SET @ddl = IF(@present = 0, 'ALTER TABLE `diagnosis` ADD COLUMN `response_type` VARCHAR(20) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'diagnosis' AND column_name = 'session_id');
SET @ddl = IF(@present = 0, 'ALTER TABLE `diagnosis` ADD COLUMN `session_id` VARCHAR(64) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'diagnosis' AND column_name = 'cost_estimate_source');
SET @ddl = IF(@present = 0, 'ALTER TABLE `diagnosis` ADD COLUMN `cost_estimate_source` VARCHAR(50) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'diagnosis' AND column_name = 'cost_currency');
SET @ddl = IF(@present = 0, 'ALTER TABLE `diagnosis` ADD COLUMN `cost_currency` VARCHAR(10) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'diagnosis' AND column_name = 'cost_assumptions');
SET @ddl = IF(@present = 0, 'ALTER TABLE `diagnosis` ADD COLUMN `cost_assumptions` VARCHAR(255) NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage' AND column_name = 'latitude');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage` ADD COLUMN `latitude` DOUBLE NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage' AND column_name = 'longitude');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage` ADD COLUMN `longitude` DOUBLE NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage' AND column_name = 'is_demo');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage` ADD COLUMN `is_demo` BOOLEAN NOT NULL DEFAULT TRUE', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage_recommendation' AND column_name = 'diagnosis_id');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage_recommendation` ADD COLUMN `diagnosis_id` BIGINT NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage_recommendation' AND column_name = 'distance');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage_recommendation` ADD COLUMN `distance` DOUBLE NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;

SET @present = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'garage_recommendation' AND column_name = 'match_score');
SET @ddl = IF(@present = 0, 'ALTER TABLE `garage_recommendation` ADD COLUMN `match_score` DOUBLE NULL', 'SELECT 1');
PREPARE additive_update FROM @ddl;
EXECUTE additive_update;
DEALLOCATE PREPARE additive_update;
