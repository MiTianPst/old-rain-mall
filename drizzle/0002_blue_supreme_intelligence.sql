ALTER TABLE `payments` ADD `provider_trade_no` varchar(128);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_provider_trade_no_unique` UNIQUE(`provider_trade_no`);