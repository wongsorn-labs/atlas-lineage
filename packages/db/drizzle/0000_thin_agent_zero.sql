CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`birth_year` integer,
	`death_year` integer,
	`birth_lat` real,
	`birth_lng` real,
	`birth_place` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`related_person_id` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
