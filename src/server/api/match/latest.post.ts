import type { MatchDetail, ParticipantWithRank } from '~/types'

export default defineEventHandler(async (event): Promise<MatchDetail> => {
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
    
    console.log('Debug - 最新試合情報を取得します, PUUID:', puuid.substring(0, 20) + '...')

    // 1. Match List API で最新の試合IDを取得
    const matchListUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`
    console.log('Debug - Match List URL:', matchListUrl)
    
    const matchIds = await $fetch<string[]>(matchListUrl, {
      headers: {
        'X-Riot-Token': apiKey
      }
    })
    
    if (!matchIds || matchIds.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: '試合履歴が見つかりません'
      })
    }

    const latestMatchId = matchIds[0]
    if (!latestMatchId) {
      throw createError({
        statusCode: 404,
        statusMessage: '最新試合IDが取得できませんでした'
      })
    }
    console.log('Debug - 最新試合ID:', latestMatchId)

    // 2. Match Detail API で試合詳細を取得
    const matchDetailUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${latestMatchId}`
    const matchDetail = await $fetch<any>(matchDetailUrl, {
      headers: {
        'X-Riot-Token': apiKey
      }
    })

    console.log('Debug - 試合詳細取得完了:', {
      matchId: latestMatchId,
      gameMode: matchDetail.info?.gameMode,
      queueId: matchDetail.info?.queueId,
      gameDuration: matchDetail.info?.gameDuration,
      participants: matchDetail.info?.participants?.length
    })

    // 3. 各参加者のランク情報を並列取得
    const participants = matchDetail.info?.participants || []
    console.log('Debug - 参加者のランク情報を取得開始:', participants.length + '人')

    const participantPromises = participants.map(async (participant: any, index: number) => {
      try {
        console.log(`Debug - ${index + 1}/10 プレイヤー ${participant.summonerName} のランク情報取得開始`)
        
        // 各プレイヤーのランク情報を取得
        const leagueUrl = `https://jp1.api.riotgames.com/lol/league/v4/entries/by-puuid/${participant.puuid}?api_key=${apiKey}`
        const rankInfo = await $fetch<any[]>(leagueUrl)
        
        console.log(`Debug - ${participant.summonerName} のランクAPI応答:`, rankInfo?.length, '件')
        
        // ソロランク情報を抽出（RANKED_SOLO_5x5）
        const soloRank = rankInfo.find((rank: any) => rank.queueType === 'RANKED_SOLO_5x5')
        
        if (soloRank) {
          console.log(`Debug - ${participant.summonerName} のソロランク: ${soloRank.tier} ${soloRank.rank}`)
        } else {
          console.log(`Debug - ${participant.summonerName} はソロランク未プレイまたは非公開`)
        }
        
        return {
          ...participant,
          rank: soloRank ? {
            tier: soloRank.tier,
            rank: soloRank.rank,
            leaguePoints: soloRank.leaguePoints,
            wins: soloRank.wins,
            losses: soloRank.losses
          } : null,
          summonerLevel: participant.summonerLevel || 0 // レベル情報を追加
        }
      } catch (error: any) {
        console.warn(`Debug - プレイヤー ${participant.summonerName} のランク情報取得失敗:`, {
          status: error.status,
          statusText: error.statusText,
          message: error.message
        })
        return {
          ...participant,
          rank: null,
          summonerLevel: participant.summonerLevel || 0 // レベル情報を追加（エラー時も）
        }
      }
    })

    const participantsWithRank = await Promise.all(participantPromises)
    console.log('Debug - ランク情報付き参加者データ取得完了')

    // 4. 自分がどちらのチームかを判定
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
    const result: MatchDetail = {
      matchId: latestMatchId,
      gameInfo: {
        gameMode: matchDetail.info.gameMode,
        queueId: matchDetail.info.queueId,
        gameDuration: matchDetail.info.gameDuration,
        gameCreation: matchDetail.info.gameCreation,
        gameEndTimestamp: matchDetail.info.gameEndTimestamp,
        gameVersion: matchDetail.info.gameVersion
      },
      myTeam: myTeam,
      enemyTeam: enemyTeam,
      myParticipant: myParticipant
    }

    return result

  } catch (error: any) {
    console.error('最新試合情報取得エラー:', error)
    
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
        statusMessage: '試合情報が見つかりません。'
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