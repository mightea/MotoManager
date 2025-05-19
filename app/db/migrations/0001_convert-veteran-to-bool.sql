PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_motorcycle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`vin` text NOT NULL,
	`vehicleIdNr` text NOT NULL,
	`is_veteran` boolean DEFAULT false NOT NULL,
	`firstRegistration` text NOT NULL,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT '2025-05-19T07:27:44.757Z',
	`created_at` text DEFAULT '2025-05-19T07:27:44.758Z'
);
--> statement-breakpoint
INSERT INTO `__new_motorcycle`("id", "make", "model", "vin", "vehicleIdNr", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at") SELECT "id", "make", "model", "vin", "vehicleIdNr", "firstRegistration", "lastInspection", "initialOdo", "updated_at", "created_at" FROM `motorcycle`;--> statement-breakpoint
DROP TABLE `motorcycle`;--> statement-breakpoint
ALTER TABLE `__new_motorcycle` RENAME TO `motorcycle`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
