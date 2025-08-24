/**
 * 【サモナー検索API】
 * 
 * 目的: Riot IDからプレイヤーの基本情報とランク情報を取得する
 * 
 * 機能:
 * - Riot ID（ゲーム名#タグライン）からPUUIDを解決
 * - プレイヤーのランク情報（ソロ/デュオ、フレックス等）を取得
 * - チャレンジ実績とトータルポイントの取得
 * - アカウント基本情報（PUUID、ゲーム名、タグライン）の統合
 * - 後続のAPIコール（試合履歴、ライブ試合等）で使用するPUUIDを提供
 */
import type { RiotAccount, SummonerInfo, LeagueEntry, SummonerSearchResult } from '~/types'
import { RiotApiManager } from '~/server/utils/RiotApiManager'

export default defineEventHandler(async (event): Promise<SummonerSearchResult> => {
  try {
    // リクエストボディを取得
    const body = await readBody(event)
    const { summonerName, tagLine } = body

    // バリデーション
    if (!summonerName || !tagLine) {
      throw createError({
        statusCode: 400,
        message: 'サモナー名とタグラインが必要です'
      })
    }

    // 環境変数からAPIキーを取得
    const apiKey = process.env.RIOT_API_KEY
    
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        message: 'Riot API キーが設定されていません'
      })
    }
    
    console.log('Debug - API Key starts with:', apiKey.substring(0, 15) + '...')

    // Riot API マネージャーを初期化
    const riotApi = new RiotApiManager(apiKey)

    // 1. Account API でRiot IDからPUUIDを取得
    console.log('Debug - Making request for account info')
    
    const accountResponse = await riotApi.getAccountByRiotId(summonerName, tagLine)
    
    console.log('Debug - Account Response:', JSON.stringify(accountResponse, null, 2))

    if (!accountResponse || !accountResponse.puuid) {
      throw createError({
        statusCode: 404,
        message: 'プレイヤーが見つかりません'
      })
    }

    // Summoner API は利用せず、PUUIDベースで取得（ログ出力は省略）

    // 3. League API でランク情報を取得（by-puuid エンドポイントを使用）
    let leagueResponse: LeagueEntry[] = []
    
    try {
      console.log('Debug - Getting league entries by PUUID')
      leagueResponse = await riotApi.getLeagueEntries(accountResponse.puuid)
      console.log('Debug - League by PUUID Response:', JSON.stringify(leagueResponse, null, 2))
    } catch (leagueError) {
      console.warn('League API by PUUID エラー:', leagueError)
    }

    // Challenges API V1でプレイヤーデータを取得（追加情報として）
    let challengesData = null
    try {
      console.log('Debug - Getting player challenges')
      challengesData = await riotApi.getPlayerChallenges(accountResponse.puuid)
      
      console.log('Debug - Challenges Response - Total Points:', challengesData.totalPoints)
      console.log('Debug - Challenges Response - Category Points:', challengesData.categoryPoints)
    } catch (challengesError: any) {
      console.warn('Challenges API エラー (スキップします):', challengesError.status, challengesError.statusText)
    }

    // レスポンスデータを整形
    const result = {
      account: {
        puuid: accountResponse.puuid,
        gameName: accountResponse.gameName,
        tagLine: accountResponse.tagLine
      },
      leagues: leagueResponse,
      challenges: challengesData || null
    }

    return result

  } catch (error: any) {
    console.error('Riot API エラー:', error)
    
    // Riot APIのエラーレスポンスを詳しく処理
    if (error.status === 401) {
      throw createError({
        statusCode: 401,
        message: `APIキーが無効または期限切れです。Riot Developer PortalでAPIキーを確認してください。 (Riot API Error: ${error.statusText})`
      })
    } else if (error.status === 403) {
      throw createError({
        statusCode: 403,
        message: `APIアクセスが拒否されました。APIキーの権限を確認してください。 (Riot API Error: ${error.statusText})`
      })
    } else if (error.status === 404) {
      throw createError({
        statusCode: 404,
        message: 'プレイヤーが見つかりません。ゲーム名とタグラインを確認してください。'
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
      message: `予期しないエラーが発生しました: ${error.message || error.statusText || 'Unknown error'} (Status: ${error.status || 'Unknown'})`
    })
  }
})
