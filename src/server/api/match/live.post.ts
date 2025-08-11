import type { LiveMatchDetail } from '~/types'
import { RiotApiManager } from '~/server/utils/RiotApiManager'

export default defineEventHandler(async (event): Promise<LiveMatchDetail> => {
  try {
    // リクエストボディを取得
    const body = await readBody(event)
    const { puuid } = body

    // バリデーション
    if (!puuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'PUUIDが必要です'
      })
    }

    // 環境変数からAPIキーを取得
    const config = useRuntimeConfig()
    const apiKey = config.riotApiKey || process.env.RIOT_API_KEY
    
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Riot API キーが設定されていません'
      })
    }
    
    console.log('Debug - 進行中試合情報を取得します, PUUID:', puuid.substring(0, 20) + '...')

    // Riot API マネージャーを初期化
    const riotApi = new RiotApiManager(apiKey)

    // 1. Spectator API V5 で進行中の試合情報を取得
    console.log('Debug - Spectator API呼び出し開始')
    
    let currentGameInfo
    try {
      currentGameInfo = await riotApi.getCurrentGame(puuid)
      console.log('Debug - 進行中試合情報取得成功:', {
        gameId: currentGameInfo.gameId,
        gameMode: currentGameInfo.gameMode,
        queueId: currentGameInfo.gameQueueConfigId,
        gameLength: currentGameInfo.gameLength,
        participants: currentGameInfo.participants?.length
      })
    } catch (spectatorError: any) {
      if (spectatorError.status === 404) {
        throw createError({
          statusCode: 404,
          statusMessage: '現在試合中ではありません。ゲーム中に再度お試行ください。'
        })
      }
      throw spectatorError
    }

    // 2. 各参加者のランク情報を並列取得
    const participants = currentGameInfo.participants || []
    console.log('Debug - 参加者のランク情報を取得開始:', participants.length + '人')

    const participantPromises = participants.map(async (participant: any, index: number) => {
      try {
        console.log(`Debug - ${index + 1}/10 プレイヤー PUUID: ${participant.puuid?.substring(0, 20)}... のランク情報取得開始`)
        
        // 各プレイヤーのランク情報を取得
        const rankInfo = await riotApi.getLeagueEntries(participant.puuid)
        
        // 各プレイヤーのサモナー情報（レベル含む）を取得
        const summonerInfo = await riotApi.getSummonerByPuuid(participant.puuid)
        
        console.log(`Debug - プレイヤー ${index + 1} のランクAPI応答:`, rankInfo?.length, '件')
        
        // ソロランク情報を抽出（RANKED_SOLO_5x5）
        const soloRank = rankInfo.find((rank: any) => rank.queueType === 'RANKED_SOLO_5x5')
        
        if (soloRank) {
          console.log(`Debug - プレイヤー ${index + 1} のソロランク: ${soloRank.tier} ${soloRank.rank}`)
        } else {
          console.log(`Debug - プレイヤー ${index + 1} はソロランク未プレイまたは非公開`)
        }
        
        return {
          puuid: participant.puuid,
          championId: participant.championId,
          teamId: participant.teamId,
          spell1Id: participant.spell1Id,
          spell2Id: participant.spell2Id,
          profileIconId: participant.profileIconId,
          bot: participant.bot,
          perks: participant.perks,
          summonerLevel: summonerInfo.summonerLevel,
          rank: soloRank ? {
            tier: soloRank.tier,
            rank: soloRank.rank,
            leaguePoints: soloRank.leaguePoints,
            wins: soloRank.wins,
            losses: soloRank.losses,
            queueType: soloRank.queueType
          } : null
        }
      } catch (error: any) {
        console.warn(`Debug - プレイヤー ${index + 1} のランク情報取得失敗:`, {
          status: error.status,
          statusText: error.statusText,
          message: error.message
        })
        
        // エラー時でもサモナー情報は取得を試みる
        let fallbackSummonerLevel = 0
        try {
          const summonerInfo = await riotApi.getSummonerByPuuid(participant.puuid)
          fallbackSummonerLevel = summonerInfo.summonerLevel || 0
        } catch (summonerError) {
          console.warn(`Debug - プレイヤー ${index + 1} のサモナー情報取得も失敗`)
        }
        
        return {
          puuid: participant.puuid,
          championId: participant.championId,
          teamId: participant.teamId,
          spell1Id: participant.spell1Id,
          spell2Id: participant.spell2Id,
          profileIconId: participant.profileIconId,
          bot: participant.bot,
          perks: participant.perks,
          summonerLevel: fallbackSummonerLevel,
          rank: null
        }
      }
    })

    const participantsWithRank = await Promise.all(participantPromises)
    console.log('Debug - ランク情報付き参加者データ取得完了')

    // 3. 自分がどちらのチームかを判定
    const myParticipant = participantsWithRank.find(p => p.puuid === puuid)
    if (!myParticipant) {
      throw createError({
        statusCode: 404,
        statusMessage: '試合内でプレイヤーが見つかりません'
      })
    }

    const myTeamId = myParticipant.teamId
    const myTeam = participantsWithRank.filter(p => p.teamId === myTeamId)
    const enemyTeam = participantsWithRank.filter(p => p.teamId !== myTeamId)

    console.log('Debug - チーム分け完了:', {
      myTeamId: myTeamId,
      myTeamSize: myTeam.length,
      enemyTeamSize: enemyTeam.length
    })

    // レスポンスデータを整形
    const result: LiveMatchDetail = {
      gameId: currentGameInfo.gameId,
      gameInfo: {
        gameMode: currentGameInfo.gameMode,
        queueId: currentGameInfo.gameQueueConfigId,
        gameStartTime: currentGameInfo.gameStartTime,
        gameLength: currentGameInfo.gameLength,
        mapId: currentGameInfo.mapId,
        platformId: currentGameInfo.platformId
      },
      myTeam: myTeam,
      enemyTeam: enemyTeam,
      myParticipant: myParticipant,
      bannedChampions: currentGameInfo.bannedChampions || [],
      observers: currentGameInfo.observers
    }

    return result

  } catch (error: any) {
    console.error('進行中試合情報取得エラー:', error)
    
    // Riot APIのエラーレスポンスを詳しく処理
    if (error.status === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: `APIキーが無効または期限切れです。 (${error.statusText})`
      })
    } else if (error.status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: `APIアクセスが拒否されました。 (${error.statusText})`
      })
    } else if (error.status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: '現在試合中ではありません。ゲーム中に再度お試しください。'
      })
    } else if (error.status === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'API使用制限に達しました。しばらく待ってから再試行してください。'
      })
    } else if (error.status >= 500) {
      throw createError({
        statusCode: 500,
        statusMessage: `Riot APIサーバーエラーが発生しました。 (${error.status}: ${error.statusText})`
      })
    }

    // その他のエラー
    throw createError({
      statusCode: 500,
      statusMessage: `予期しないエラーが発生しました: ${error.message || error.statusText || 'Unknown error'}`
    })
  }
})