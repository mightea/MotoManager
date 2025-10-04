CREATE TABLE IF NOT EXISTS `currencies` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `code` text NOT NULL UNIQUE,
  `symbol` text NOT NULL,
  `label` text,
  `created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

INSERT INTO `currencies` (`code`, `symbol`, `label`) VALUES
  ('CHF', 'CHF', 'Schweizer Franken'),
  ('EUR', '€', 'Euro'),
  ('AUD', 'A$', 'Australischer Dollar')
ON CONFLICT(`code`) DO NOTHING;
