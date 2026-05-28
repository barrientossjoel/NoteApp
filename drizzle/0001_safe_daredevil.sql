CREATE TABLE `landing_search_data` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`date_str` text NOT NULL,
	`description` text NOT NULL,
	`order` integer DEFAULT 0
);
