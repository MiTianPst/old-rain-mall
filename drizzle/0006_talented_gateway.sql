DROP TABLE IF EXISTS `rate_limits_next`;
--> statement-breakpoint
CREATE TABLE `rate_limits_next` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`count` int unsigned NOT NULL,
	`last_request` bigint unsigned NOT NULL,
	CONSTRAINT `rate_limits_next_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limits_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
INSERT INTO `rate_limits_next` (`key`, `count`, `last_request`)
SELECT `key`, `count`, `last_request` FROM `rate_limits`;
--> statement-breakpoint
DROP TABLE `rate_limits`;
--> statement-breakpoint
RENAME TABLE `rate_limits_next` TO `rate_limits`;
