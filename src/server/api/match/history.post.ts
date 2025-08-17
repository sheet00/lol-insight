/**
 * 【試合履歴取得API】
 * 
 * 目的: プレイヤーの過去試合履歴を一覧形式で取得し、基本的な結果情報を提供する
 * 
 * 機能:
 * - 指定されたPUUIDの試合履歴リストを並列取得
 * - 各試合の基本情報（勝敗、KDA、使用チャンピオン、ゲームモード）を抽出
 * - ページネーション機能で段階的に履歴を読み込み
 * - ゲームモードの日本語化とチャンピオン名の変換
 * - 試合詳細画面への遷移用データとして活用
 */
import type { MatchHistoryResponse, MatchHistoryItem } from '~/types'
import { RiotApiManager } from '~/server/utils/RiotApiManager'
import championData from "~/data/champion.json"
import { formatGameMode } from "@/utils/gameFormatters"
import { createChampionIdMap, createGetChampionName } from "@/utils/championUtils"

// チャンピオンデータ初期化
const championIdMap = createChampionIdMap(championData)
const getChampionName = createGetChampionName(championIdMap)

export default defineEventHandler(async (event): Promise<MatchHistoryResponse> => {
  try {
    // リクエストボディを取得
    const body = await readBody(event)
    const { puuid, startIndex = 0, count = 5 } = body

    // バリデーション
    if (!puuid) {
      throw createError({
        statusCode: 400,
        message: 'PUUIDが必要です'
      })
    }

    // 環境変数からAPIキーを取得
    const config = useRuntimeConfig()
    const apiKey = config.riotApiKey || process.env.RIOT_API_KEY
    
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        message: 'Riot API キーが設定されていません'
      })
    }
    
    console.log('Debug - 試合履歴を取得します, PUUID:', puuid.substring(0, 20) + '...', 'startIndex:', startIndex, 'count:', count)

    // Riot API マネージャーを初期化
    const riotApi = new RiotApiManager(apiKey)

    // 1. Match List API で試合IDリストを取得
    console.log('Debug - Getting match IDs')
    const matchIds = await riotApi.getMatchIds(puuid, startIndex, count)
    
    if (!matchIds || matchIds.length === 0) {
      return {
        matches: [],
        hasMore: false,
        currentPage: Math.floor(startIndex / count),
        totalMatches: 0
      }
    }

    console.log('Debug - 取得した試合ID:', matchIds.length + '件')

    // 2. 各試合の基本情報を並列取得
    const matchPromises = matchIds.map(async (matchId: string) => {
      try {
        console.log('Debug - 試合詳細取得開始:', matchId)
        const matchDetail = await riotApi.getMatchDetail(matchId)
        
        // 自分の参加者情報を検索
        const myParticipant = matchDetail.info?.participants?.find((p: any) => p.puuid === puuid)
        if (!myParticipant) {
          console.warn('Debug - 自分のプレイヤーが見つかりません:', matchId)
          return null
        }

        // ゲームモードを取得
        const gameMode = formatGameMode(matchDetail.info.queueId)
        const championName = getChampionName(myParticipant.championId)
        const result = myParticipant.win ? 'WIN' : 'LOSE'
        const kda = `${myParticipant.kills}/${myParticipant.deaths}/${myParticipant.assists}`

        const historyItem: MatchHistoryItem = {
          matchId,
          gameMode,
          queueId: matchDetail.info.queueId,
          gameCreation: matchDetail.info.gameCreation,
          gameDuration: matchDetail.info.gameDuration,
          myChampion: championName,
          result: result as 'WIN' | 'LOSE',
          kda,
          gameEndTimestamp: matchDetail.info.gameEndTimestamp
        }

        console.log('Debug - 試合基本情報生成完了:', {
          matchId,
          champion: championName,
          result,
          kda,
          gameMode
        })

        return historyItem

      } catch (error: any) {
        console.warn('Debug - 試合詳細取得失敗:', matchId, error.message)
        return null
      }
    })

    // 並列実行して結果を取得
    const matchResults = await Promise.all(matchPromises)
    
    // null結果を除外
    const matches = matchResults.filter((match): match is MatchHistoryItem => match !== null)

    console.log('Debug - 試合履歴取得完了:', matches.length + '件')

    // より多くの試合があるかチェック
    let hasMore = false
    try {
      const nextBatch = await riotApi.getMatchIds(puuid, startIndex + count, 1)
      hasMore = nextBatch && nextBatch.length > 0
    } catch (error) {
      console.log('Debug - 次のページチェック失敗（最後のページの可能性）')
      hasMore = false
    }

    const response: MatchHistoryResponse = {
      matches,
      hasMore,
      currentPage: Math.floor(startIndex / count),
      totalMatches: matches.length
    }

    return response

  } catch (error: any) {
    console.error('試合履歴取得エラー:', error)
    
    // Riot APIのエラーレスポンスを詳しく処理
    if (error.status === 401) {
      throw createError({
        statusCode: 401,
        message: `APIキーが無効または期限切れです。 (${error.statusText})`
      })
    } else if (error.status === 403) {
      throw createError({
        statusCode: 403,
        message: `APIアクセスが拒否されました。 (${error.statusText})`
      })
    } else if (error.status === 404) {
      throw createError({
        statusCode: 404,
        message: '試合履歴が見つかりません。'
      })
    } else if (error.status === 429) {
      throw createError({
        statusCode: 429,
        message: 'API使用制限に達しました。しばらく待ってから再試行してください。'
      })
    } else if (error.status >= 500) {
      throw createError({
        statusCode: 500,
        message: `Riot APIサーバーエラーが発生しました。 (${error.status}: ${error.statusText})`
      })
    }

    // その他のエラー
    throw createError({
      statusCode: 500,
      message: `予期しないエラーが発生しました: ${error.message || error.statusText || 'Unknown error'}`
    })
  }
})