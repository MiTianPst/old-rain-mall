CREATE TABLE `after_sales` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`description` varchar(1000) NOT NULL,
	`status` enum('REQUESTED','APPROVED','REJECTED','REFUNDING','REFUNDED') NOT NULL DEFAULT 'REQUESTED',
	`refund_amount_cents` bigint unsigned NOT NULL,
	`review_note` varchar(1000),
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp,
	`refunded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `after_sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `after_sales_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`carrier` varchar(100) NOT NULL,
	`tracking_no` varchar(100) NOT NULL,
	`status` enum('PENDING','SHIPPED','IN_TRANSIT','DELIVERED') NOT NULL DEFAULT 'PENDING',
	`shipped_at` timestamp,
	`delivered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipments_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('PENDING_PAYMENT','PAID','SHIPPED','IN_TRANSIT','DELIVERED','COMPLETED','CANCELLED','CLOSED','REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `payment_status` enum('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` enum('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD `idempotency_key` varchar(160);--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_idempotency_key_unique` UNIQUE(`idempotency_key`);--> statement-breakpoint
ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `after_sales` ADD CONSTRAINT `after_sales_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `after_sales_user_created_idx` ON `after_sales` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `after_sales_status_created_idx` ON `after_sales` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `shipments_status_updated_idx` ON `shipments` (`status`,`updated_at`);