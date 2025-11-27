PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_motorcycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`model_year` integer,
	`user_id` integer NOT NULL,
	`vin` text,
	`vehicle_nr` text,
	`number_plate` text,
	`image` text,
	`is_veteran` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`firstRegistration` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`manual_odo` integer DEFAULT 0,
	`purchase_date` text,
	`purchase_price` real,
	`currency_code` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
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
	`initialOdo`,
	`manual_odo`,
	`purchase_date`,
	`purchase_price`,
	`currency_code`
) SELECT
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
	`initialOdo`,
	`manual_odo`,
	`purchase_date`,
	`purchase_price`,
	`currency_code`
FROM `motorcycles`;--> statement-breakpoint
DROP TABLE `motorcycles`;--> statement-breakpoint
ALTER TABLE `__new_motorcycles` RENAME TO `motorcycles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
