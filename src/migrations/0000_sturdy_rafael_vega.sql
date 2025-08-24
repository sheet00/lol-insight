CREATE TABLE `cost_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
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
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
