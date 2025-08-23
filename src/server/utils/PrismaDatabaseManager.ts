// SQLITE一時無効化: Prisma Database Manager
// import { PrismaClient } from '@prisma/client'
// import { PrismaD1 } from '@prisma/adapter-d1'

// SQLITE一時無効化: ダミークラス
export class PrismaDatabaseManager {
  private static client: any = null

  /**
   * Prisma Client インスタンス取得
   * 環境に応じて自動切り替え
   */
  static getClient(env?: any): any {
    console.log('⚠️ SQLITE一時無効化: PrismaDatabaseManager is disabled')
    return null
  }


  /**
   * コストログ保存（SQLITE一時無効化）
   */
  static async saveCostLog(
    costData: any,
    env?: any
  ) {
    console.log('⚠️ SQLITE一時無効化: saveCostLog is disabled')
  }


  /**
   * コストログ取得（SQLITE一時無効化）
   */
  static async getCostLogs(limit = 100, env?: any) {
    console.log('⚠️ SQLITE一時無効化: getCostLogs is disabled')
    return []
  }

  /**
   * 今日のコスト合計取得（SQLITE一時無効化）
   */
  static async getTodayCost(env?: any) {
    console.log('⚠️ SQLITE一時無効化: getTodayCost is disabled')
    return { totalUsd: 0, totalJpy: 0 }
  }

  /**
   * 接続終了（SQLITE一時無効化）
   */
  static async disconnect() {
    console.log('⚠️ SQLITE一時無効化: disconnect is disabled')
  }
}