/**
 * 【リアルタイム試合AIアドバイス生成API】
 * 
 * 目的: 進行中のLoL試合において、チーム構成とマッチアップ情報を基に
 *       生成AIを活用してリアルタイムでプレイアドバイスを生成する
 * 
 * 機能:
 * - 進行中の試合情報（ゲームID、チーム構成、敵チーム構成）を受け取り
 * - OpenRouterのAIモデルを使用してマッチアップ分析を実行
 * - プレイヤー向けの戦略的アドバイスを生成して返却
 * - エラーハンドリング（レート制限、設定不足等）を含む
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { OpenRouterClient, type AdvicePayload } from '~/server/utils/OpenRouterClient'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, gameInfo, myChampion, myTeam, enemyTeam, model } = body || {}

  console.log('[DEBUG] Received request body:', {
    hasGameId: !!gameId,
    hasGameInfo: !!gameInfo,
    hasMyChampion: !!myChampion,
    myChampion: myChampion,
    hasMyTeam: Array.isArray(myTeam),
    hasEnemyTeam: Array.isArray(enemyTeam),
    myTeamLength: Array.isArray(myTeam) ? myTeam.length : 0,
    enemyTeamLength: Array.isArray(enemyTeam) ? enemyTeam.length : 0,
  })

  if (!gameId || !gameInfo || !myChampion || !Array.isArray(myTeam) || !Array.isArray(enemyTeam)) {
    console.error('[DEBUG] Missing fields validation failed:', {
      gameId: !!gameId,
      gameInfo: !!gameInfo,
      myChampion: !!myChampion,
      myTeam: Array.isArray(myTeam),
      enemyTeam: Array.isArray(enemyTeam),
    })
    throw createError({ statusCode: 400, message: '必要なフィールドが不足しています' })
  }

  // championName を含むことを軽く検証
  const hasNames = [...myTeam, ...enemyTeam].every((p: any) => typeof p?.championName === 'string' && p.championName.length > 0)
  if (!hasNames || typeof myChampion?.championName !== 'string' || !myChampion.championName.length) {
    throw createError({ statusCode: 400, message: 'championName が必要です（IDではなく名称を送ってください）' })
  }

  try {
    try {
      console.log('[AI] /api/advice/pre-match called', {
        gameId,
        gameMode: gameInfo?.gameMode,
        queueId: gameInfo?.queueId,
        myChampion: myChampion?.championName,
        myTeam: myTeam.map((p: any) => p?.championName),
        enemyTeam: enemyTeam.map((p: any) => p?.championName),
      })
    } catch { /* noop */ }
    const client = new OpenRouterClient()
    const payload: AdvicePayload = { gameId, gameInfo, myChampion, myTeam, enemyTeam, model }
    const json = await client.generateAdvice(payload)
    return json
  } catch (e: any) {
    console.error('[AI] /api/advice/pre-match failed', e?.message || e)
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
