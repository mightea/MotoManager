ALTER TABLE `maintenance_records` ADD `location_id` integer REFERENCES `locations`(`id`);
