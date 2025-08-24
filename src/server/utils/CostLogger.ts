/**
 * OpenRouter API 費用ログ管理クラス
 *
 * 開発環境: SQLite、本番環境: Cloudflare D1
 * DrizzleDatabaseManagerを通じてデータベースへの接続を自己解決する
 */

import { v4 as uuidv4 } from "uuid";
import { CostCalculator, type CostResult } from "./CostCalculator";
import { DrizzleDatabaseManager } from "./DrizzleDatabaseManager";
import * as schema from "../db/schema";

// Drizzleのスキーマをベースにしたログエントリの型
export type CostLogPayload = {
  id?: string;
  timestamp?: string | Date;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  totalCostJpy: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
  metadata?: any;
  level: string;
};

export class CostLogger {
  /**
   * ログ出力の実装
   * DrizzleDatabaseManagerを使ってデータベースに保存
   */
  private static async writeLog(
    logData: typeof schema.costLogs.$inferInsert
  ): Promise<void> {
    try {
      const db = DrizzleDatabaseManager.getInstance();
      await db.insert(schema.costLogs).values(logData);
    } catch (error) {
      console.error("[CostLogger] Failed to save to database:", error);
      // DB保存失敗してもconsole.logは継続
    }

    // 従来のconsole.logも残す
    console.log(`[CostLog] ${JSON.stringify(logData)}`);
  }

  /**
   * 費用ログを記録
   * @param payload ログデータ
   */
  static async logCost(payload: CostLogPayload): Promise<void> {
    try {
      const now = new Date();
      const logData: typeof schema.costLogs.$inferInsert = {
        id: payload.id || uuidv4(),
        timestamp: payload.timestamp ? new Date(payload.timestamp) : now,
        createdAt: now,
        endpoint: payload.endpoint,
        model: payload.model,
        promptTokens: payload.promptTokens,
        completionTokens: payload.completionTokens,
        totalTokens: payload.totalTokens,
        inputCostUsd: payload.inputCostUsd,
        outputCostUsd: payload.outputCostUsd,
        totalCostUsd: payload.totalCostUsd,
        totalCostJpy: payload.totalCostJpy,
        responseTimeMs: payload.responseTimeMs,
        success: payload.success,
        error: payload.error || null,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        level: payload.level,
      };

      // ログ出力
      await this.writeLog(logData);
    } catch (error) {
      console.error("[CostLogger] Failed to log cost:", error);
    }
  }

  /**
   * 簡単な費用ログ記録（使用量から自動計算）
   */
  static async logCostSimple(
    endpoint: string,
    model: string,
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    },
    metadata?: any,
    responseTimeMs: number = 0,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    if (!CostCalculator.isModelSupported(model)) {
      console.log(
        `[CostLogger] Skipping cost log for unsupported model: ${model}`
      );
      return;
    }

    const cost = CostCalculator.calculateCost(
      model,
      usage.prompt_tokens,
      usage.completion_tokens
    );

    if (!cost) {
      console.log(
        `[CostLogger] Failed to calculate cost for model: ${model}, skipping log`
      );
      return;
    }

    await this.logCost({
      endpoint,
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCostUsd: cost.input_cost_usd,
      outputCostUsd: cost.output_cost_usd,
      totalCostUsd: cost.total_cost_usd,
      totalCostJpy: cost.total_cost_jpy,
      metadata,
      responseTimeMs,
      success,
      error,
      level: "info",
    });
  }

  /**
   * エラー専用ログ記録
   */
  static async logError(
    endpoint: string,
    model: string,
    error: string,
    responseTimeMs: number = 0,
    metadata?: any
  ): Promise<void> {
    await this.logCost({
      endpoint,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      inputCostUsd: 0,
      outputCostUsd: 0,
      totalCostUsd: 0,
      totalCostJpy: 0,
      success: false,
      error,
      responseTimeMs,
      metadata,
      level: "error",
    });
  }
}
