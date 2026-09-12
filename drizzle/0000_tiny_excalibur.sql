CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(100) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` varchar(2000),
	`refresh_token` varchar(2000),
	`id_token` varchar(2000),
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` varchar(500),
	`password` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` varchar(500),
	`role` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
	`membership_level` tinyint unsigned NOT NULL DEFAULT 0,
	`lifetime_paid_cents` bigint unsigned NOT NULL DEFAULT 0,
	`membership_upgraded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_membership_level_check` CHECK(`users`.`membership_level` between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` varchar(500),
	`sort_order` int unsigned NOT NULL DEFAULT 0,
	`status` enum('ACTIVE','HIDDEN') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`product_id` int unsigned NOT NULL,
	`url` varchar(1000) NOT NULL,
	`alt_text` varchar(255),
	`sort_order` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`category_id` int unsigned NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`summary` varchar(500),
	`description` text,
	`price_cents` int unsigned NOT NULL,
	`stock` int unsigned NOT NULL DEFAULT 0,
	`status` enum('DRAFT','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
	`cover_url` varchar(1000),
	`version` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` int unsigned NOT NULL,
	`quantity` int unsigned NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_user_product_unique` UNIQUE(`user_id`,`product_id`),
	CONSTRAINT `cart_items_quantity_check` CHECK(`cart_items`.`quantity` > 0)
);
--> statement-breakpoint
CREATE TABLE `membership_level_logs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`order_id` int unsigned NOT NULL,
	`from_level` tinyint unsigned NOT NULL,
	`to_level` tinyint unsigned NOT NULL,
	`lifetime_paid_cents` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `membership_level_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_level_logs_order_unique` UNIQUE(`order_id`),
	CONSTRAINT `membership_level_logs_from_level_check` CHECK(`membership_level_logs`.`from_level` between 0 and 3),
	CONSTRAINT `membership_level_logs_to_level_check` CHECK(`membership_level_logs`.`to_level` between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_id` int unsigned NOT NULL,
	`product_id` int unsigned NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`product_cover_url` varchar(1000),
	`unit_price_cents` int unsigned NOT NULL,
	`quantity` int unsigned NOT NULL,
	`subtotal_cents` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_items_quantity_check` CHECK(`order_items`.`quantity` > 0)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`order_no` varchar(32) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`status` enum('PENDING_PAYMENT','PAID','SHIPPED','COMPLETED','CANCELLED','CLOSED') NOT NULL DEFAULT 'PENDING_PAYMENT',
	`payment_status` enum('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
	`membership_level_snapshot` tinyint unsigned NOT NULL DEFAULT 0,
	`original_amount_cents` bigint unsigned NOT NULL,
	`discount_rate_bps` int unsigned NOT NULL DEFAULT 10000,
	`member_discount_cents` bigint unsigned NOT NULL DEFAULT 0,
	`shipping_fee_cents` int unsigned NOT NULL DEFAULT 0,
	`total_cents` bigint unsigned NOT NULL,
	`recipient_name` varchar(100) NOT NULL,
	`recipient_phone` varchar(32) NOT NULL,
	`recipient_address` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`paid_at` timestamp,
	`cancelled_at` timestamp,
	`shipped_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_no_unique` UNIQUE(`order_no`),
	CONSTRAINT `orders_membership_level_check` CHECK(`orders`.`membership_level_snapshot` between 0 and 3),
	CONSTRAINT `orders_discount_rate_check` CHECK(`orders`.`discount_rate_bps` between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`payment_no` varchar(32) NOT NULL,
	`order_id` int unsigned NOT NULL,
	`method` enum('MOCK') NOT NULL DEFAULT 'MOCK',
	`status` enum('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
	`amount_cents` bigint unsigned NOT NULL,
	`paid_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_payment_no_unique` UNIQUE(`payment_no`),
	CONSTRAINT `payments_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_level_logs` ADD CONSTRAINT `membership_level_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_level_logs` ADD CONSTRAINT `membership_level_logs_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `verifications_expires_at_idx` ON `verifications` (`expires_at`);--> statement-breakpoint
CREATE INDEX `categories_status_sort_idx` ON `categories` (`status`,`sort_order`);--> statement-breakpoint
CREATE INDEX `product_images_product_sort_idx` ON `product_images` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `products_category_status_idx` ON `products` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `products_status_created_idx` ON `products` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `cart_items_user_id_idx` ON `cart_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `membership_level_logs_user_created_idx` ON `membership_level_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_expiration_idx` ON `orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `payments_status_created_idx` ON `payments` (`status`,`created_at`);