ALTER TABLE `users` ADD `username` text NOT NULL;--> statement-breakpoint
UPDATE `users`
SET `username` = lower(`email`)
WHERE `username` IS NULL OR `username` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
