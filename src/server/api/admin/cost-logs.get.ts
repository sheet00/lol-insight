/**
 * コストログ一覧取得API
 * Prismaを使って費用ログの詳細一覧を取得
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { 
      limit = 50, 
      offset = 0, 
      endpoint = null,
      model = null,
      success = null,
      period = null
    } = query

    const prisma = PrismaDatabaseManager.getClient(event.context.cloudflare?.env)

    // フィルター条件の構築
    const whereCondition: any = {}

    if (endpoint) {
      whereCondition.endpoint = { contains: endpoint as string }
    }

    if (model) {
      whereCondition.model = { contains: model as string }
    }

    if (success !== null) {
      whereCondition.success = success === 'true'
    }

    // 期間フィルター
    if (period) {
      const now = new Date()
      let dateFilter: any = {}

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

      if (Object.keys(dateFilter).length > 0) {
        whereCondition.timestamp = dateFilter
      }
    }

    // コストログ取得
    const logs = await prisma.costLog.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        timestamp: true,
        endpoint: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        inputCostUsd: true,
        outputCostUsd: true,
        totalCostUsd: true,
        totalCostJpy: true,
        responseTimeMs: true,
        success: true,
        error: true,
        metadata: true,
        level: true,
      }
    })

    // 総件数取得（ページネーション用）
    const totalCount = await prisma.costLog.count({
      where: whereCondition
    })

    return {
      success: true,
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })),
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: (Number(offset) + Number(limit)) < totalCount
      }
    }

  } catch (error) {
    console.error('Cost logs error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get cost logs'
    })
  }
})