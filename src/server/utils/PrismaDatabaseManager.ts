// Prisma Database Manager
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

export class PrismaDatabaseManager {
  private static client: PrismaClient | null = null

  /**
   * Prisma Client インスタンス取得
   * 環境に応じて自動切り替え
   */
  static getClient(env?: any): PrismaClient {
    if (this.client) return this.client

    // 本番環境：Cloudflare D1
    if (env?.LOGS_DB) {
      console.log('☁️ Using Cloudflare D1 with Prisma')
      const adapter = new PrismaD1(env.LOGS_DB)
      this.client = new PrismaClient({ 
        adapter: adapter as any  // TypeScript型エラー回避
      } as any)
    }
    // 開発環境：ローカルSQLite
    else {
      console.log('🔧 Using local SQLite with Prisma')
      this.client = new PrismaClient()
    }

    return this.client
  }

  /**
   * ログ保存
   */
  static async saveLog(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any,
    env?: any
  ) {
    try {
      const prisma = this.getClient(env)
      
      await prisma.log.create({
        data: {
          level,
          message,
          data: data ? JSON.stringify(data) : null,
        },
      })

      console.log(`📝 Log saved: [${level.toUpperCase()}] ${message}`)
    } catch (error) {
      console.error('❌ Failed to save log:', error)
    }
  }

  /**
   * ログ取得
   */
  static async getLogs(limit = 100, env?: any) {
    try {
      const prisma = this.getClient(env)
      
      const logs = await prisma.log.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return logs.map(log => ({
        ...log,
        data: log.data ? JSON.parse(log.data) : null,
      }))
    } catch (error) {
      console.error('❌ Failed to get logs:', error)
      return []
    }
  }

  /**
   * コストログ保存
   */
  static async saveCostLog(
    costData: {
      id: string
      timestamp?: Date
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
      level?: string
    },
    env?: any
  ) {
    try {
      const prisma = this.getClient(env)
      
      await prisma.costLog.create({
        data: {
          ...costData,
          timestamp: costData.timestamp || new Date(),
          level: costData.level || 'info',
          metadata: costData.metadata ? JSON.stringify(costData.metadata) : null,
        },
      })

      console.log(`💰 Cost log saved: ${costData.endpoint} - $${costData.totalCostUsd}`)
    } catch (error) {
      console.error('❌ Failed to save cost log:', error)
    }
  }


  /**
   * コストログ取得
   */
  static async getCostLogs(limit = 100, env?: any) {
    try {
      const prisma = this.getClient(env)
      
      const logs = await prisma.costLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }))
    } catch (error) {
      console.error('❌ Failed to get cost logs:', error)
      return []
    }
  }

  /**
   * 今日のコスト合計取得
   */
  static async getTodayCost(env?: any) {
    try {
      const prisma = this.getClient(env)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const result = await prisma.costLog.aggregate({
        _sum: {
          totalCostUsd: true,
          totalCostJpy: true,
        },
        where: {
          timestamp: {
            gte: today,
          },
          success: true,
        },
      })

      return {
        totalUsd: result._sum.totalCostUsd || 0,
        totalJpy: result._sum.totalCostJpy || 0,
      }
    } catch (error) {
      console.error('❌ Failed to get today cost:', error)
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
    }
  }
}