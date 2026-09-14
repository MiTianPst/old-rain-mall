CREATE TABLE `favorites` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorites_user_product_unique` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` int unsigned NOT NULL,
	`order_item_id` int unsigned NOT NULL,
	`rating` tinyint unsigned NOT NULL,
	`content` varchar(1000) NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`review_note` varchar(500),
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_reviews_user_product_unique` UNIQUE(`user_id`,`product_id`),
	CONSTRAINT `product_reviews_rating_check` CHECK(`product_reviews`.`rating` between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE `product_views` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` int unsigned NOT NULL,
	`view_count` int unsigned NOT NULL DEFAULT 1,
	`last_viewed_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_views_user_product_unique` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_order_item_id_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_views` ADD CONSTRAINT `product_views_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_views` ADD CONSTRAINT `product_views_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `favorites_user_created_idx` ON `favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_reviews_product_status_created_idx` ON `product_reviews` (`product_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_reviews_status_created_idx` ON `product_reviews` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_views_user_last_viewed_idx` ON `product_views` (`user_id`,`last_viewed_at`);