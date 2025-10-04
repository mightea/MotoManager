CREATE TABLE `documents` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `file_path` text NOT NULL,
  `preview_path` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE TABLE `document_motorcycles` (
  `document_id` integer NOT NULL,
  `motorcycle_id` integer NOT NULL,
  PRIMARY KEY (`document_id`, `motorcycle_id`),
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX `document_motorcycles_motorcycle_idx` ON `document_motorcycles`(`motorcycle_id`);
