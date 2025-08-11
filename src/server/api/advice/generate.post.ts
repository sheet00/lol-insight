import { defineEventHandler, readBody, createError } from 'h3'
import { OpenRouterClient, type AdvicePayload } from '~/server/utils/OpenRouterClient'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, gameInfo, myTeam, enemyTeam } = body || {}

  if (!gameId || !gameInfo || !Array.isArray(myTeam) || !Array.isArray(enemyTeam)) {
    throw createError({ statusCode: 400, message: '必要なフィールドが不足しています' })
  }

  // championName を含むことを軽く検証
  const hasNames = [...myTeam, ...enemyTeam].every((p: any) => typeof p?.championName === 'string' && p.championName.length > 0)
  if (!hasNames) {
    throw createError({ statusCode: 400, message: 'championName が必要です（IDではなく名称を送ってください）' })
  }

  try {
    try {
      console.log('[AI] /api/advice/generate called', {
        gameId,
        gameMode: gameInfo?.gameMode,
        queueId: gameInfo?.queueId,
        myTeam: myTeam.map((p: any) => p?.championName),
        enemyTeam: enemyTeam.map((p: any) => p?.championName),
      })
    } catch { /* noop */ }
    const client = new OpenRouterClient()
    const payload: AdvicePayload = { gameId, gameInfo, myTeam, enemyTeam }
    const json = await client.generateAdvice(payload)
    return json
  } catch (e: any) {
    console.error('[AI] /api/advice/generate failed', e?.message || e)
    if (e?.status === 429) {
      throw createError({ statusCode: 429, message: 'レート制限に達しました。時間をおいて再試行してください' })
    }
    // 設定不足（ENV 未設定）など
    if (e?.message?.includes('OPENROUTER_')) {
      throw createError({ statusCode: 500, message: e.message })
    }
    // 具体的なエラー内容を返す
    const status = e?.statusCode || e?.status || 500
    const detail = e?.message || e?.statusText || String(e)
    throw createError({ statusCode: status, message: `AIアドバイス生成エラー: ${detail}` })
  }
})
