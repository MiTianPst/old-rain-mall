CREATE TABLE `audit_logs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`operator_user_id` varchar(36) NOT NULL,
	`action` varchar(100) NOT NULL,
	`target_type` varchar(100) NOT NULL,
	`target_id` varchar(100) NOT NULL,
	`summary` varchar(1000) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` varchar(255) NOT NULL,
	`count` int unsigned NOT NULL,
	`last_request` bigint unsigned NOT NULL,
	CONSTRAINT `rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('ACTIVE','FROZEN') DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `admin_note` varchar(1000);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_operator_user_id_users_id_fk` FOREIGN KEY (`operator_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_operator_created_idx` ON `audit_logs` (`operator_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_created_idx` ON `audit_logs` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);