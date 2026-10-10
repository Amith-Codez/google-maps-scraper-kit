CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service` text NOT NULL,
	`clients` text NOT NULL,
	`area` text,
	`city` text,
	`lat` real,
	`lon` real,
	`language` text DEFAULT 'en' NOT NULL,
	`keywords_json` text,
	`plan_why` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`found` integer DEFAULT 0 NOT NULL,
	`ideas_rejected` integer DEFAULT 0 NOT NULL,
	`sent` integer DEFAULT 0 NOT NULL,
	`replies` integer DEFAULT 0 NOT NULL,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer,
	`lead_id` integer,
	`agent` text NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`data_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_lead` ON `events` (`lead_id`);--> statement-breakpoint
CREATE INDEX `events_campaign` ON `events` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`idx` integer NOT NULL,
	`title` text NOT NULL,
	`pitch_line` text NOT NULL,
	`how_service_delivers` text,
	`evidence_key` text,
	`scores_json` text,
	`verdict` text DEFAULT 'pending' NOT NULL,
	`reject_reason` text,
	`twin_verdict_json` text,
	`model` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ideas_lead` ON `ideas` (`lead_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`run_after` integer NOT NULL,
	`campaign_id` integer,
	`lead_id` integer,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_key` ON `jobs` (`key`);--> statement-breakpoint
CREATE INDEX `jobs_claim` ON `jobs` (`status`,`run_after`,`priority`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`place_key` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`rating` real,
	`review_count` integer,
	`address` text,
	`lat` real,
	`lon` real,
	`phone` text,
	`website` text,
	`website_kind` text,
	`email` text,
	`email_status` text,
	`channel` text,
	`evidence_json` text,
	`score` integer,
	`score_reason` text,
	`stage` text DEFAULT 'found' NOT NULL,
	`needs_review` integer DEFAULT false NOT NULL,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`follow_up_at` integer,
	`contacted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_campaign_place` ON `leads` (`campaign_id`,`place_key`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`direction` text NOT NULL,
	`kind` text DEFAULT 'initial' NOT NULL,
	`channel` text NOT NULL,
	`to_addr` text,
	`from_addr` text,
	`subject` text,
	`body` text,
	`body_before` text,
	`principles_json` text,
	`voice_script` text,
	`image_url` text,
	`audio_path` text,
	`message_id` text,
	`in_reply_to` text,
	`is_preview` integer DEFAULT false NOT NULL,
	`intent` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`error` text,
	`sent_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_lead` ON `messages` (`lead_id`);--> statement-breakpoint
CREATE INDEX `messages_msgid` ON `messages` (`message_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppression` (
	`contact` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
