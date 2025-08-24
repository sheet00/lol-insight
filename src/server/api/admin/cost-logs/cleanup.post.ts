/**
 * コストログ一括削除API
 * 古いログやフィルタに一致するログを一括削除
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      olderThan = null,    // 指定日数より古いログを削除（日数）
      endpoint = null,     // 特定エンドポイントのログを削除
      model = null,        // 特定モデルのログを削除
      success = null,      // 成功/失敗ログのみ削除
      ids = null          // 特定IDのログを削除
    } = body

    const prisma = PrismaDatabaseManager.getClient(event.context.cloudflare?.env)

    // 削除条件の構築
    const whereCondition: any = {}

    // 古いログの削除（日数指定）
    if (olderThan && Number(olderThan) > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number(olderThan))
      whereCondition.timestamp = { lt: cutoffDate }
    }

    // エンドポイント指定削除
    if (endpoint) {
      whereCondition.endpoint = endpoint
    }

    // モデル指定削除
    if (model) {
      whereCondition.model = model
    }

    // 成功/失敗指定削除
    if (success !== null) {
      whereCondition.success = success
    }

    // 特定ID削除
    if (ids && Array.isArray(ids) && ids.length > 0) {
      whereCondition.id = { in: ids }
    }

    // 削除対象が指定されていない場合はエラー
    if (Object.keys(whereCondition).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No deletion criteria specified'
      })
    }

    // 削除前にカウント取得
    const countToDelete = await prisma.costLog.count({
      where: whereCondition
    })

    if (countToDelete === 0) {
      return {
        success: true,
        message: 'No logs match the deletion criteria',
        deleted: 0
      }
    }

    // 一括削除実行
    const deleteResult = await prisma.costLog.deleteMany({
      where: whereCondition
    })

    return {
      success: true,
      message: `Successfully deleted ${deleteResult.count} cost logs`,
      deleted: deleteResult.count,
      criteria: {
        olderThan,
        endpoint,
        model,
        success,
        ids: ids ? ids.length : 0
      }
    }

  } catch (error: any) {
    console.error('Cleanup cost logs error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to cleanup cost logs'
    })
  }
})