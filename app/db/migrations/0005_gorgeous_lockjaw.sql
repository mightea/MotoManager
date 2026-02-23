CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tire_interval` integer DEFAULT 8 NOT NULL,
	`battery_lithium_interval` integer DEFAULT 10 NOT NULL,
	`battery_default_interval` integer DEFAULT 6 NOT NULL,
	`engine_oil_interval` integer DEFAULT 2 NOT NULL,
	`gearbox_oil_interval` integer DEFAULT 2 NOT NULL,
	`final_drive_oil_interval` integer DEFAULT 2 NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);