ALTER TABLE `documents` ADD COLUMN `owner_id` integer REFERENCES `users`(`id`) ON DELETE cascade;
ALTER TABLE `documents` ADD COLUMN `is_private` integer NOT NULL DEFAULT 0;
