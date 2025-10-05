CREATE TABLE `currencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`symbol` text NOT NULL,
	`label` text,
	`conversion_factor` real DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `currencies_code_unique` ON `currencies` (`code`);--> statement-breakpoint
CREATE TABLE `document_motorcycles` (
	`document_id` integer NOT NULL,
	`motorcycle_id` integer NOT NULL,
	PRIMARY KEY(`document_id`, `motorcycle_id`),
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`file_path` text NOT NULL,
	`preview_path` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`odo` integer NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`date` text DEFAULT (CURRENT_DATE),
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `location_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`odometer` integer,
	`date` text DEFAULT (CURRENT_DATE) NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`odo` integer NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`cost` real,
	`currency` text,
	`description` text,
	`type` text NOT NULL,
	`brand` text,
	`model` text,
	`tire_position` text,
	`tire_size` text,
	`dot_code` text,
	`battery_type` text,
	`fluid_type` text,
	`viscosity` text,
	`oil_type` text,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `motorcycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`model_year` integer,
	`vin` text NOT NULL,
	`vehicle_nr` text,
	`number_plate` text,
	`image` text,
	`is_veteran` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`firstRegistration` text,
	`lastInspection` text,
	`initialOdo` integer DEFAULT 0 NOT NULL,
	`manual_odo` integer DEFAULT 0,
	`purchase_date` text,
	`purchase_price` real
);
--> statement-breakpoint
CREATE TABLE `torque_specs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`torque` real NOT NULL,
	`variation` real,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
