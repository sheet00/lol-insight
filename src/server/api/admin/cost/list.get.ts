/**
 * コストログ一覧取得API
 * Prismaを使って費用ログの詳細一覧を取得
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { limit = 50, offset = 0 } = query

    const prisma = PrismaDatabaseManager.getClient(event.context.cloudflare?.env)

    // コストログ取得
    const logs = await prisma.costLog.findMany({
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
    const totalCount = await prisma.costLog.count()

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