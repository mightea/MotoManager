PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tire_interval` integer DEFAULT 8 NOT NULL,
	`battery_lithium_interval` integer DEFAULT 10 NOT NULL,
	`battery_default_interval` integer DEFAULT 6 NOT NULL,
	`engine_oil_interval` integer DEFAULT 2 NOT NULL,
	`gearbox_oil_interval` integer DEFAULT 2 NOT NULL,
	`final_drive_oil_interval` integer DEFAULT 2 NOT NULL,
	`fork_oil_interval` integer DEFAULT 4 NOT NULL,
	`brake_fluid_interval` integer DEFAULT 4 NOT NULL,
	`coolant_interval` integer DEFAULT 4 NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_settings`("id", "user_id", "tire_interval", "battery_lithium_interval", "battery_default_interval", "engine_oil_interval", "gearbox_oil_interval", "final_drive_oil_interval", "fork_oil_interval", "brake_fluid_interval", "coolant_interval", "updated_at") SELECT "id", "user_id", "tire_interval", "battery_lithium_interval", "battery_default_interval", "engine_oil_interval", "gearbox_oil_interval", "final_drive_oil_interval", "fork_oil_interval", "brake_fluid_interval", "coolant_interval", "updated_at" FROM `user_settings`;--> statement-breakpoint
DROP TABLE `user_settings`;--> statement-breakpoint
ALTER TABLE `__new_user_settings` RENAME TO `user_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);