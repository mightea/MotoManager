CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`odo` integer NOT NULL,
	`description` text NOT NULL,
	`updated_at` text DEFAULT '2025-05-19T19:04:31.555Z',
	`created_at` text DEFAULT '2025-05-19T19:04:31.556Z',
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycle`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_motorcycle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`vin` text NOT NULL,
	`vehicleIdNr` text NOT NULL,
	`is_veteran` integer DEFAULT false NOT NULL,
	`firstRegistration` text NOT NULL,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT '2025-05-19T19:04:31.555Z',
	`created_at` text DEFAULT '2025-05-19T19:04:31.556Z'
);
--> statement-breakpoint
INSERT INTO `__new_motorcycle`("id", "make", "model", "vin", "vehicleIdNr", "is_veteran", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at") SELECT "id", "make", "model", "vin", "vehicleIdNr", "is_veteran", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at" FROM `motorcycle`;--> statement-breakpoint
DROP TABLE `motorcycle`;--> statement-breakpoint
ALTER TABLE `__new_motorcycle` RENAME TO `motorcycle`;--> statement-breakpoint
PRAGMA foreign_keys=ON;