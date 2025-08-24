/**
 * コストログ削除API
 * 指定されたIDのコストログを削除
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'

export default defineEventHandler(async (event) => {
  try {
    const logId = getRouterParam(event, 'id')

    if (!logId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Log ID is required'
      })
    }

    const prisma = PrismaDatabaseManager.getClient(event.context.cloudflare?.env)

    // ログが存在するか確認
    const existingLog = await prisma.costLog.findUnique({
      where: { id: logId }
    })

    if (!existingLog) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cost log not found'
      })
    }

    // ログ削除
    await prisma.costLog.delete({
      where: { id: logId }
    })

    return {
      success: true,
      message: `Cost log ${logId} deleted successfully`
    }

  } catch (error: any) {
    console.error('Delete cost log error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete cost log'
    })
  }
})