ALTER TABLE `products` ADD `compare_at_price_cents` int unsigned;--> statement-breakpoint
ALTER TABLE `products` ADD `is_featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `featured_sort` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `promotion_label` varchar(30);--> statement-breakpoint
CREATE INDEX `products_status_featured_sort_idx` ON `products` (`status`,`is_featured`,`featured_sort`);