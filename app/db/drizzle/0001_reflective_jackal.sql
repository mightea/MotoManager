PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_current_location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`date` text DEFAULT '2025-05-11T17:24:56.758Z' NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_current_location`("id", "motorcycle_id", "date", "name") SELECT "id", "motorcycle_id", "date", "name" FROM `current_location`;--> statement-breakpoint
DROP TABLE `current_location`;--> statement-breakpoint
ALTER TABLE `__new_current_location` RENAME TO `current_location`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_motorcycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`vin` text NOT NULL,
	`vehicleIdNr` text NOT NULL,
	`licenseType` text DEFAULT 'regular',
	`firstRegistration` text NOT NULL,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT '2025-05-11T17:24:56.757Z',
	`created_at` text DEFAULT '2025-05-11T17:24:56.758Z'
);
--> statement-breakpoint
INSERT INTO `__new_motorcycles`("id", "make", "model", "vin", "vehicleIdNr", "licenseType", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at") SELECT "id", "make", "model", "vin", "vehicleIdNr", "licenseType", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at" FROM `motorcycles`;--> statement-breakpoint
DROP TABLE `motorcycles`;--> statement-breakpoint
ALTER TABLE `__new_motorcycles` RENAME TO `motorcycles`;