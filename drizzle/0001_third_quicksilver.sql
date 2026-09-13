CREATE TABLE `user_addresses` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`recipient_name` varchar(100) NOT NULL,
	`recipient_phone` varchar(32) NOT NULL,
	`province` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`district` varchar(100) NOT NULL,
	`detail_address` varchar(500) NOT NULL,
	`label` varchar(50),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_addresses_user_id_idx` ON `user_addresses` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_addresses_user_default_idx` ON `user_addresses` (`user_id`,`is_default`);