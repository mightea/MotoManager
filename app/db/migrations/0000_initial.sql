CREATE TABLE `current_location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycle`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`odo` integer NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`cost` real NOT NULL,
	`currency` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycle`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_battery` (
	`maintenance_id` integer PRIMARY KEY NOT NULL,
	`battery_type` text NOT NULL,
	`manufacturer` text NOT NULL,
	`model` text NOT NULL,
	FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_record`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_breakpads` (
	`maintenance_id` integer PRIMARY KEY NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`position` text NOT NULL,
	FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_record`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_fluid` (
	`maintenance_id` integer PRIMARY KEY NOT NULL,
	`brand` text NOT NULL,
	`fluid_type` text NOT NULL,
	`viscosity` text,
	FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_record`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_tire` (
	`maintenance_id` integer PRIMARY KEY NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`size` text NOT NULL,
	`position` text NOT NULL,
	`dot_code` text NOT NULL,
	FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_record`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `motorcycle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`vin` text NOT NULL,
	`vehicleIdNr` text NOT NULL,
	`licenseType` text DEFAULT 'regular',
	`firstRegistration` text NOT NULL,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT '2025-05-14T18:21:10.796Z',
	`created_at` text DEFAULT '2025-05-14T18:21:10.797Z'
);
