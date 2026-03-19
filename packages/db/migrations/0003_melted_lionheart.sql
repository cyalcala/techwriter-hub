CREATE TABLE `system_health` (
	`id` text PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`status` text NOT NULL,
	`last_success` integer,
	`error_message` text,
	`updated_at` integer
);