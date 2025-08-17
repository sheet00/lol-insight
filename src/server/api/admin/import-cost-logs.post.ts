/**
 * JSONLコストログファイルインポートAPI
 * 既存のJSONLファイルからPrismaデータベースにインポート
 */
import { PrismaDatabaseManager } from '~/server/utils/PrismaDatabaseManager'
import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { filePath } = body

    if (!filePath) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File path is required'
      })
    }

    // JSONLファイル読み込み
    const fullPath = join(process.cwd(), filePath)
    const fileContent = readFileSync(fullPath, 'utf-8')
    const lines = fileContent.trim().split('\n')

    let imported = 0
    let failed = 0

    for (const line of lines) {
      try {
        const jsonData = JSON.parse(line)
        
        // Prismaに保存
        await PrismaDatabaseManager.saveCostLogFromJsonl(
          jsonData,
          event.context.cloudflare?.env
        )
        imported++
      } catch (error) {
        console.error('Failed to import line:', error)
        failed++
      }
    }

    return {
      success: true,
      imported,
      failed,
      total: lines.length,
      message: `Successfully imported ${imported} cost logs (${failed} failed)`
    }

  } catch (error) {
    console.error('Import cost logs error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import cost logs'
    })
  }
})