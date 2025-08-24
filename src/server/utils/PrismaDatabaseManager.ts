import { PrismaClient } from '@prisma/client'
import type { CostLog } from '@prisma/client'

export class PrismaDatabaseManager {
  private static client: PrismaClient | null = null

  /**
   * Prisma Client インスタンス取得
   * 環境に応じて自動切り替え
   */
  static getClient(env?: any): PrismaClient {
    if (!this.client) {
      this.client = new PrismaClient()
    }
    return this.client
  }

  /**
   * コストログ保存
   */
  static async saveCostLog(
    costData: {
      id: string
      timestamp: Date
      endpoint: string
      model: string
      promptTokens: number
      completionTokens: number
      totalTokens: number
      inputCostUsd: number
      outputCostUsd: number
      totalCostUsd: number
      totalCostJpy: number
      responseTimeMs: number
      success: boolean
      error?: string
      metadata?: any
      level: string
    },
    env?: any
  ): Promise<CostLog> {
    const client = this.getClient(env)
    
    try {
      const result = await client.costLog.create({
        data: {
          id: costData.id,
          timestamp: costData.timestamp,
          endpoint: costData.endpoint,
          model: costData.model,
          promptTokens: costData.promptTokens,
          completionTokens: costData.completionTokens,
          totalTokens: costData.totalTokens,
          inputCostUsd: costData.inputCostUsd,
          outputCostUsd: costData.outputCostUsd,
          totalCostUsd: costData.totalCostUsd,
          totalCostJpy: costData.totalCostJpy,
          responseTimeMs: costData.responseTimeMs,
          success: costData.success,
          error: costData.error,
          metadata: costData.metadata ? JSON.stringify(costData.metadata) : null,
          level: costData.level,
        }
      })
      
      console.log(`[PrismaDatabaseManager] Cost log saved: ${costData.id}`)
      return result
    } catch (error) {
      console.error('[PrismaDatabaseManager] Failed to save cost log:', error)
      throw error
    }
  }

  /**
   * コストログ取得
   */
  static async getCostLogs(limit = 100, env?: any): Promise<CostLog[]> {
    const client = this.getClient(env)
    
    try {
      const logs = await client.costLog.findMany({
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      })
      
      return logs
    } catch (error) {
      console.error('[PrismaDatabaseManager] Failed to get cost logs:', error)
      return []
    }
  }

  /**
   * 今日のコスト合計取得
   */
  static async getTodayCost(env?: any): Promise<{ totalUsd: number, totalJpy: number }> {
    const client = this.getClient(env)
    
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const result = await client.costLog.aggregate({
        where: {
          timestamp: {
            gte: today,
            lt: tomorrow
          },
          success: true
        },
        _sum: {
          totalCostUsd: true,
          totalCostJpy: true
        }
      })
      
      return {
        totalUsd: result._sum.totalCostUsd || 0,
        totalJpy: result._sum.totalCostJpy || 0
      }
    } catch (error) {
      console.error('[PrismaDatabaseManager] Failed to get today cost:', error)
      return { totalUsd: 0, totalJpy: 0 }
    }
  }

  /**
   * 接続終了
   */
  static async disconnect() {
    if (this.client) {
      await this.client.$disconnect()
      this.client = null
      console.log('[PrismaDatabaseManager] Database connection closed')
    }
  }
}