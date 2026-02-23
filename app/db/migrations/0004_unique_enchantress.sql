CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`challenge` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
