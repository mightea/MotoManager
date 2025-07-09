PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`odo` integer NOT NULL,
	`description` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`date` text DEFAULT '2025-07-09T19:34:28.287Z' NOT NULL,
	`updated_at` text DEFAULT '2025-07-09T19:34:28.287Z',
	`created_at` text DEFAULT '2025-07-09T19:34:28.287Z',
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycle`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_issues`("id", "motorcycle_id", "odo", "description", "priority", "updated_at", "created_at") SELECT "id", "motorcycle_id", "odo", "description", "priority", "updated_at", "created_at" FROM `issues`;--> statement-breakpoint
DROP TABLE `issues`;--> statement-breakpoint
ALTER TABLE `__new_issues` RENAME TO `issues`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_motorcycle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`vin` text NOT NULL,
	`vehicleIdNr` text NOT NULL,
	`image` text,
	`is_veteran` integer DEFAULT false NOT NULL,
	`firstRegistration` text NOT NULL,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT '2025-07-09T19:34:28.287Z',
	`created_at` text DEFAULT '2025-07-09T19:34:28.287Z'
);
--> statement-breakpoint
INSERT INTO `__new_motorcycle`("id", "make", "model", "vin", "vehicleIdNr", "image", "is_veteran", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at") SELECT "id", "make", "model", "vin", "vehicleIdNr", "image", "is_veteran", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at" FROM `motorcycle`;--> statement-breakpoint
DROP TABLE `motorcycle`;--> statement-breakpoint
ALTER TABLE `__new_motorcycle` RENAME TO `motorcycle`;
