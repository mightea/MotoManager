ALTER TABLE `currencies`
  ADD COLUMN `conversion_factor` real NOT NULL DEFAULT 1;

UPDATE `currencies`
SET `conversion_factor` = 1
WHERE `code` = 'CHF';

UPDATE `currencies`
SET `conversion_factor` = 0.95
WHERE `code` = 'EUR';

UPDATE `currencies`
SET `conversion_factor` = 1.45
WHERE `code` = 'AUD';
