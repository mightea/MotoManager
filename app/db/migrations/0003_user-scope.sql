INSERT INTO `users` ("email", "username", "name", "password_hash", "role")
SELECT 'system@placeholder.local', 'system', 'System', '00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM `users`);
--> statement-breakpoint
CREATE TABLE `__new_motorcycles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `make` text NOT NULL,
  `model` text NOT NULL,
  `model_year` integer,
  `user_id` integer NOT NULL,
  `vin` text NOT NULL,
  `vehicle_nr` text,
  `number_plate` text,
  `image` text,
  `is_veteran` integer DEFAULT 0 NOT NULL,
  `is_archived` integer DEFAULT 0 NOT NULL,
  `firstRegistration` text,
  `lastInspection` text,
  `initialOdo` integer DEFAULT 0 NOT NULL,
  `manual_odo` integer DEFAULT 0,
  `purchase_date` text,
  `purchase_price` real,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_motorcycles` (
  `id`,
  `make`,
  `model`,
  `model_year`,
  `user_id`,
  `vin`,
  `vehicle_nr`,
  `number_plate`,
  `image`,
  `is_veteran`,
  `is_archived`,
  `firstRegistration`,
  `lastInspection`,
  `initialOdo`,
  `manual_odo`,
  `purchase_date`,
  `purchase_price`
)
SELECT
  `id`,
  `make`,
  `model`,
  `model_year`,
  COALESCE((SELECT id FROM `users` ORDER BY id LIMIT 1), 1),
  `vin`,
  `vehicle_nr`,
  `number_plate`,
  `image`,
  `is_veteran`,
  `is_archived`,
  `firstRegistration`,
  `lastInspection`,
  `initialOdo`,
  `manual_odo`,
  `purchase_date`,
  `purchase_price`
FROM `motorcycles`;
--> statement-breakpoint
DROP TABLE `motorcycles`;
--> statement-breakpoint
ALTER TABLE `__new_motorcycles` RENAME TO `motorcycles`;
--> statement-breakpoint
CREATE TABLE `__new_locations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `user_id` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_locations` (`id`, `name`, `user_id`)
SELECT `id`, `name`, COALESCE((SELECT id FROM `users` ORDER BY id LIMIT 1), 1)
FROM `locations`;
--> statement-breakpoint
DROP TABLE `locations`;
--> statement-breakpoint
ALTER TABLE `__new_locations` RENAME TO `locations`;
