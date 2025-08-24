PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cost_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`input_cost_usd` real NOT NULL,
	`output_cost_usd` real NOT NULL,
	`total_cost_usd` real NOT NULL,
	`total_cost_jpy` real NOT NULL,
	`response_time_ms` integer NOT NULL,
	`success` integer NOT NULL,
	`error` text,
	`metadata` text,
	`level` text NOT NULL,
	`created_at` text DEFAULT (datetime('now', '+9 hours', 'localtime')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_cost_logs`("id", "endpoint", "model", "prompt_tokens", "completion_tokens", "total_tokens", "input_cost_usd", "output_cost_usd", "total_cost_usd", "total_cost_jpy", "response_time_ms", "success", "error", "metadata", "level", "created_at") SELECT "id", "endpoint", "model", "prompt_tokens", "completion_tokens", "total_tokens", "input_cost_usd", "output_cost_usd", "total_cost_usd", "total_cost_jpy", "response_time_ms", "success", "error", "metadata", "level", "created_at" FROM `cost_logs`;--> statement-breakpoint
DROP TABLE `cost_logs`;--> statement-breakpoint
ALTER TABLE `__new_cost_logs` RENAME TO `cost_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;