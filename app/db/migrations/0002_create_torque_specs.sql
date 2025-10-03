CREATE TABLE `torque_specs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `motorcycle_id` integer NOT NULL,
  `category` text NOT NULL,
  `name` text NOT NULL,
  `torque` real NOT NULL,
  `variation` real,
  `description` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX `torque_specs_motorcycle_idx` ON `torque_specs`(`motorcycle_id`);
