CREATE TABLE `previous_owners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`name` text NOT NULL,
	`surname` text NOT NULL,
	`purchase_date` text NOT NULL,
	`address` text,
	`city` text,
	`postcode` text,
	`country` text,
	`phone_number` text,
	`email` text,
	`comments` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
