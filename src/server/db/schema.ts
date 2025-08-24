import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const costLogs = sqliteTable("cost_logs", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  // usage情報
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  // cost情報
  inputCostUsd: real("input_cost_usd").notNull(),
  outputCostUsd: real("output_cost_usd").notNull(),
  totalCostUsd: real("total_cost_usd").notNull(),
  totalCostJpy: real("total_cost_jpy").notNull(),
  // その他の情報
  responseTimeMs: integer("response_time_ms").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  error: text("error"),
  metadata: text("metadata"),
  level: text("level").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
