/**
 * 【試合後詳細分析AIアドバイス生成API】
 * 
 * 目的: 終了したLoL試合の詳細データを基に、パフォーマンス分析と
 *       改善点の提案を生成AIで行い、次回試合に向けたアドバイスを提供する
 * 
 * 機能:
 * - 完了した試合の詳細情報（スタッツ、タイムライン、チーム構成等）を受け取り
 * - 試合結果、KDA、オブジェクト獲得状況、試合展開を総合的に分析
 * - 個人プレイの改善点と次回試合への具体的なアドバイスを生成
 * - 勝敗に関わらず建設的なフィードバックを提供
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { OpenRouterClient } from '~/server/utils/OpenRouterClient'

export type PostMatchAdvicePayload = {
  matchId: string;
  matchData: {
    gameInfo: any;
    myTeam: any[];
    enemyTeam: any[];
    myParticipant: any;
    teamStats: any;
    analysisSummary: any;
    timelineEvents: any[];
  };
  model?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { matchId, matchData, model } = body || {}

  console.log('[DEBUG] Post-match advice request:', {
    hasMatchId: !!matchId,
    hasMatchData: !!matchData,
    hasGameInfo: !!matchData?.gameInfo,
    hasMyTeam: Array.isArray(matchData?.myTeam),
    hasEnemyTeam: Array.isArray(matchData?.enemyTeam),
    hasMyParticipant: !!matchData?.myParticipant,
    hasTimelineEvents: Array.isArray(matchData?.timelineEvents),
    timelineEventsCount: Array.isArray(matchData?.timelineEvents) ? matchData.timelineEvents.length : 0,
    model: model || 'default'
  })

  // バリデーション
  if (!matchId || !matchData) {
    console.error('[DEBUG] Missing required fields:', {
      matchId: !!matchId,
      matchData: !!matchData
    })
    throw createError({ 
      statusCode: 400, 
      message: 'matchIdとmatchDataが必要です' 
    })
  }

  if (!matchData.gameInfo || !Array.isArray(matchData.myTeam) || !Array.isArray(matchData.enemyTeam) || !matchData.myParticipant) {
    console.error('[DEBUG] Invalid matchData structure:', {
      gameInfo: !!matchData.gameInfo,
      myTeam: Array.isArray(matchData.myTeam),
      enemyTeam: Array.isArray(matchData.enemyTeam),
      myParticipant: !!matchData.myParticipant
    })
    throw createError({ 
      statusCode: 400, 
      message: 'matchDataの構造が不正です（gameInfo, myTeam, enemyTeam, myParticipantが必要）' 
    })
  }

  try {
    console.log('[AI] /api/advice/post-match called', {
      matchId,
      gameMode: matchData.gameInfo?.gameMode,
      queueId: matchData.gameInfo?.queueId,
      gameDuration: matchData.gameInfo?.gameDuration,
      myChampion: matchData.myParticipant?.championName,
      result: matchData.myParticipant?.win ? 'WIN' : 'LOSE',
      myTeamSize: matchData.myTeam.length,
      enemyTeamSize: matchData.enemyTeam.length,
      timelineEventsCount: matchData.timelineEvents?.length || 0
    })

    const client = new OpenRouterClient()
    const payload: PostMatchAdvicePayload = { matchId, matchData, model }
    
    // 新しいメソッドを呼び出し（次のステップで実装する）
    const analysis = await client.generatePostMatchAdvice(payload)
    
    return {
      success: true,
      matchId,
      analysis,
      timestamp: new Date().toISOString()
    }

  } catch (e: any) {
    console.error('[AI] /api/advice/post-match failed', e?.message || e)
    
    if (e?.status === 429) {
      throw createError({ 
        statusCode: 429, 
        message: 'レート制限に達しました。時間をおいて再試行してください' 
      })
    }
    
    // 設定不足（ENV 未設定）など
    if (e?.message?.includes('OPENROUTER_')) {
      throw createError({ 
        statusCode: 500, 
        message: e.message 
      })
    }
    
    // 具体的なエラー内容を返す
    const status = e?.statusCode || e?.status || 500
    const detail = e?.message || e?.statusText || String(e)
    throw createError({ 
      statusCode: status, 
      message: `試合後AIアドバイス生成エラー: ${detail}` 
    })
  }
})