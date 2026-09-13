CREATE TABLE `product_variants` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`product_id` int unsigned NOT NULL,
	`sku_code` varchar(255) NOT NULL,
	`name` varchar(200) NOT NULL,
	`attributes_json` text NOT NULL,
	`price_cents` int unsigned NOT NULL,
	`stock` int unsigned NOT NULL DEFAULT 0,
	`status` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_sku_code_unique` UNIQUE(`sku_code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`variant_id` int unsigned NOT NULL,
	`type` enum('INITIAL','INBOUND','SALE','CANCEL_RESTORE','REFUND_RESTORE','ADJUSTMENT') NOT NULL,
	`quantity_delta` int NOT NULL,
	`stock_before` int unsigned NOT NULL,
	`stock_after` int unsigned NOT NULL,
	`reference_type` varchar(50),
	`reference_id` varchar(100),
	`operator_user_id` varchar(36),
	`note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_images` ADD `is_primary` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_items` ADD `variant_id` int unsigned;--> statement-breakpoint
ALTER TABLE `order_items` ADD `variant_id` int unsigned;--> statement-breakpoint
ALTER TABLE `order_items` ADD `variant_name` varchar(200);--> statement-breakpoint
ALTER TABLE `order_items` ADD `variant_attributes_json` text;--> statement-breakpoint
INSERT INTO `product_variants` (`product_id`, `sku_code`, `name`, `attributes_json`, `price_cents`, `stock`, `status`)
SELECT `products`.`id`, CONCAT(`products`.`slug`, '-default'), '默认规格', '{}', `products`.`price_cents`, `products`.`stock`, 'ACTIVE'
FROM `products`
WHERE NOT EXISTS (
	SELECT 1
	FROM `product_variants`
	WHERE `product_variants`.`sku_code` = CONCAT(`products`.`slug`, '-default')
);--> statement-breakpoint
UPDATE `cart_items`
INNER JOIN `products` ON `products`.`id` = `cart_items`.`product_id`
INNER JOIN `product_variants` ON `product_variants`.`sku_code` = CONCAT(`products`.`slug`, '-default')
SET `cart_items`.`variant_id` = `product_variants`.`id`
WHERE `cart_items`.`variant_id` IS NULL;--> statement-breakpoint
UPDATE `order_items`
INNER JOIN `products` ON `products`.`id` = `order_items`.`product_id`
INNER JOIN `product_variants` ON `product_variants`.`sku_code` = CONCAT(`products`.`slug`, '-default')
SET `order_items`.`variant_id` = `product_variants`.`id`,
	`order_items`.`variant_name` = `product_variants`.`name`,
	`order_items`.`variant_attributes_json` = `product_variants`.`attributes_json`
WHERE `order_items`.`variant_id` IS NULL;--> statement-breakpoint
ALTER TABLE `cart_items` MODIFY COLUMN `variant_id` int unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `variant_id` int unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `variant_name` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `variant_attributes_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_items` DROP INDEX `cart_items_user_product_unique`;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_user_variant_unique` UNIQUE(`user_id`,`variant_id`);--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_operator_user_id_users_id_fk` FOREIGN KEY (`operator_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_variants_product_status_idx` ON `product_variants` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_variant_created_idx` ON `inventory_transactions` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_reference_idx` ON `inventory_transactions` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_operator_idx` ON `inventory_transactions` (`operator_user_id`);--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_items_variant_id_idx` ON `order_items` (`variant_id`);
