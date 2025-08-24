/**
 * コストログ統計API
 * Prismaを使って費用統計を取得
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { period } = query // デフォルト値を削除

    const prisma = PrismaDatabaseManager.getClient(event.context.cloudflare?.env)

    // 期間設定
    let dateFilter: any = {}
    if (period) {
      const now = new Date()
      switch (period) {
        case 'today':
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          dateFilter = { gte: today }
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          dateFilter = { gte: weekAgo }
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          dateFilter = { gte: monthAgo }
          break
      }
    }

    // 基本統計
    const totalStats = await prisma.costLog.aggregate({
      _sum: {
        totalCostUsd: true,
        totalCostJpy: true,
        totalTokens: true,
      },
      _count: {
        id: true,
      },
      where: {
        timestamp: dateFilter,
        success: true,
      },
    })

    // エンドポイント別統計
    const endpointStats = await prisma.costLog.groupBy({
      by: ['endpoint'],
      _sum: {
        totalCostUsd: true,
        totalTokens: true,
      },
      _count: {
        id: true,
      },
      where: {
        timestamp: dateFilter,
        success: true,
      },
      orderBy: {
        _sum: {
          totalCostUsd: 'desc',
        },
      },
    })

    // モデル別統計
    const modelStats = await prisma.costLog.groupBy({
      by: ['model'],
      _sum: {
        totalCostUsd: true,
        totalTokens: true,
      },
      _count: {
        id: true,
      },
      where: {
        timestamp: dateFilter,
        success: true,
      },
      orderBy: {
        _sum: {
          totalCostUsd: 'desc',
        },
      },
    })

    // 最新のログ
    const recentLogs = await prisma.costLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      where: {
        timestamp: dateFilter,
      },
      select: {
        id: true,
        timestamp: true,
        endpoint: true,
        model: true,
        totalCostUsd: true,
        totalTokens: true,
        success: true,
        responseTimeMs: true,
      },
    })

    return {
      success: true,
      period,
      total: {
        cost_usd: totalStats._sum.totalCostUsd || 0,
        cost_jpy: totalStats._sum.totalCostJpy || 0,
        tokens: totalStats._sum.totalTokens || 0,
        requests: totalStats._count.id || 0,
      },
      by_endpoint: endpointStats.map(stat => ({
        endpoint: stat.endpoint,
        cost_usd: stat._sum.totalCostUsd || 0,
        tokens: stat._sum.totalTokens || 0,
        requests: stat._count.id || 0,
      })),
      by_model: modelStats.map(stat => ({
        model: stat.model,
        cost_usd: stat._sum.totalCostUsd || 0,
        tokens: stat._sum.totalTokens || 0,
        requests: stat._count.id || 0,
      })),
      recent_logs: recentLogs,
    }

  } catch (error) {
    console.error('Cost stats error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get cost statistics'
    })
  }
})