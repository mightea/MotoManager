ALTER TABLE `user_settings` ADD `driveshaft_oil_interval` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `fork_oil_interval` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `brake_fluid_interval` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `coolant_interval` integer DEFAULT 4 NOT NULL;