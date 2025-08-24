/**
 * コストログ統計API
 * Drizzleを使って費用統計を取得
 */
import { DrizzleDatabaseManager } from "~/server/utils/DrizzleDatabaseManager";
import { costLogs } from "~/server/db/schema";
import { desc, count, sum, gte, eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { period } = query; // デフォルト値を削除

    const db = DrizzleDatabaseManager.getInstance();

    // 期間設定
    let dateFilter: any = undefined;
    if (period) {
      const now = new Date();
      switch (period) {
        case "today":
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFilter = gte(costLogs.createdAt, today);
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = gte(costLogs.createdAt, weekAgo);
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = gte(costLogs.createdAt, monthAgo);
          break;
      }
    }

    // 基本統計のWHERE条件
    const baseWhere = dateFilter
      ? sql`${eq(costLogs.success, true)} AND ${dateFilter}`
      : eq(costLogs.success, true);

    // 基本統計
    const totalStats = await db
      .select({
        totalCostUsd: sum(costLogs.totalCostUsd),
        totalCostJpy: sum(costLogs.totalCostJpy),
        totalTokens: sum(costLogs.totalTokens),
        count: count(),
      })
      .from(costLogs)
      .where(baseWhere);

    // エンドポイント別統計
    const endpointStats = await db
      .select({
        endpoint: costLogs.endpoint,
        totalCostUsd: sum(costLogs.totalCostUsd),
        totalTokens: sum(costLogs.totalTokens),
        count: count(),
      })
      .from(costLogs)
      .where(baseWhere)
      .groupBy(costLogs.endpoint)
      .orderBy(desc(sum(costLogs.totalCostUsd)));

    // モデル別統計
    const modelStats = await db
      .select({
        model: costLogs.model,
        totalCostUsd: sum(costLogs.totalCostUsd),
        totalTokens: sum(costLogs.totalTokens),
        count: count(),
      })
      .from(costLogs)
      .where(baseWhere)
      .groupBy(costLogs.model)
      .orderBy(desc(sum(costLogs.totalCostUsd)));

    // 最新のログ
    const whereClause = dateFilter ? dateFilter : undefined;
    const recentLogs = await db
      .select({
        id: costLogs.id,
        createdAt: costLogs.createdAt,
        endpoint: costLogs.endpoint,
        model: costLogs.model,
        totalCostUsd: costLogs.totalCostUsd,
        totalTokens: costLogs.totalTokens,
        success: costLogs.success,
        responseTimeMs: costLogs.responseTimeMs,
      })
      .from(costLogs)
      .where(whereClause)
      .orderBy(desc(costLogs.createdAt))
      .limit(10);

    return {
      success: true,
      period,
      total: {
        cost_usd: Number(totalStats[0]?.totalCostUsd) || 0,
        cost_jpy: Number(totalStats[0]?.totalCostJpy) || 0,
        tokens: Number(totalStats[0]?.totalTokens) || 0,
        requests: Number(totalStats[0]?.count) || 0,
      },
      by_endpoint: endpointStats.map((stat: any) => ({
        endpoint: stat.endpoint,
        cost_usd: Number(stat.totalCostUsd) || 0,
        tokens: Number(stat.totalTokens) || 0,
        requests: Number(stat.count) || 0,
      })),
      by_model: modelStats.map((stat: any) => ({
        model: stat.model,
        cost_usd: Number(stat.totalCostUsd) || 0,
        tokens: Number(stat.totalTokens) || 0,
        requests: Number(stat.count) || 0,
      })),
      recent_logs: recentLogs,
    };
  } catch (error) {
    console.error("Cost stats error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get cost statistics",
    });
  }
});
