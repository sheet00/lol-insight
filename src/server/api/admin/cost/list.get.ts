/**
 * コストログ一覧取得API
 * Drizzleを使って費用ログの詳細一覧を取得
 */
import { DrizzleDatabaseManager } from "~/server/utils/DrizzleDatabaseManager";
import { costLogs } from "~/server/db/schema";
import { desc, count } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { limit = 50, offset = 0 } = query;

    const db = DrizzleDatabaseManager.getInstance();

    // コストログ取得
    const logs = await db
      .select({
        id: costLogs.id,
        timestamp: costLogs.timestamp,
        createdAt: costLogs.createdAt,
        endpoint: costLogs.endpoint,
        model: costLogs.model,
        promptTokens: costLogs.promptTokens,
        completionTokens: costLogs.completionTokens,
        totalTokens: costLogs.totalTokens,
        inputCostUsd: costLogs.inputCostUsd,
        outputCostUsd: costLogs.outputCostUsd,
        totalCostUsd: costLogs.totalCostUsd,
        totalCostJpy: costLogs.totalCostJpy,
        responseTimeMs: costLogs.responseTimeMs,
        success: costLogs.success,
        error: costLogs.error,
        metadata: costLogs.metadata,
        level: costLogs.level,
      })
      .from(costLogs)
      .orderBy(desc(costLogs.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // 総件数取得（ページネーション用）
    const totalCountResult = await db.select({ count: count() }).from(costLogs);
    const totalCount = totalCountResult[0].count;

    return {
      success: true,
      logs: logs.map((log: any) => ({
        ...log,
        metadata: log.metadata || null,
      })),
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount,
      },
    };
  } catch (error) {
    console.error("Cost logs error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get cost logs",
    });
  }
});
