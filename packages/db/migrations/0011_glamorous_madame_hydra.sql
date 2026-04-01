ALTER TABLE `opportunities` ADD `relevance_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `display_tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX `domain_rank_idx` ON `opportunities` (`relevance_score`,`tier`);