import type { MatchDetail, ParticipantWithRank, TeamStats, MatchAnalysisSummary, TeamSummary, PlayerDetailedStats, TopPlayerStats, PlayerSummaryStats, TimelineEvent } from '~/types'
import { RiotApiManager } from '~/server/utils/RiotApiManager'
import championData from "~/data/champion.json"
import itemData from "~/data/item.json"

// まとめ情報を生成する関数
function generateMatchAnalysisSummary(
  matchId: string,
  gameInfo: any,
  myTeam: ParticipantWithRank[],
  enemyTeam: ParticipantWithRank[],
  myParticipant: ParticipantWithRank,
  teamStats: TeamStats
): MatchAnalysisSummary {
  
  // 基本ゲーム情報
  const gameBasicInfo = {
    gameMode: gameInfo.gameMode,
    queueId: gameInfo.queueId,
    gameDuration: gameInfo.gameDuration,
    gameEndTimestamp: gameInfo.gameEndTimestamp,
    gameVersion: gameInfo.gameVersion,
    matchResult: myParticipant.win ? 'WIN' as const : 'LOSE' as const
  }

  // チーム成績サマリー
  const createTeamSummary = (team: ParticipantWithRank[], teamId: number): TeamSummary => {
    const totalKills = team.reduce((sum, p) => sum + p.kills, 0)
    const totalDeaths = team.reduce((sum, p) => sum + p.deaths, 0)
    const totalAssists = team.reduce((sum, p) => sum + p.assists, 0)
    const totalGold = team.reduce((sum, p) => sum + p.goldEarned, 0)
    const totalDamageToChampions = team.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0)
    const averageLevel = team.reduce((sum, p) => sum + (p.summonerLevel || 1), 0) / team.length

    const teamData = teamId === teamStats.myTeam.teamId ? teamStats.myTeam : teamStats.enemyTeam
    
    return {
      teamId,
      win: teamData.win,
      totalKills,
      totalDeaths,
      totalAssists,
      totalGold,
      totalDamageToChampions,
      averageLevel: Math.round(averageLevel),
      objectives: {
        towers: teamData.objectives.tower.kills,
        dragons: teamData.objectives.dragon.kills,
        barons: teamData.objectives.baron.kills,
        heralds: teamData.objectives.riftHerald.kills,
        inhibitors: teamData.objectives.inhibitor.kills
      }
    }
  }

  const teamPerformance = {
    myTeam: createTeamSummary(myTeam, teamStats.myTeam.teamId),
    enemyTeam: createTeamSummary(enemyTeam, teamStats.enemyTeam.teamId)
  }

  // ゲームタイムライン（基本版）
  const gameTimeline = {
    objectives: {
      firstBlood: {
        team: 'my' as const,
        time: 0,
        player: 'Unknown'
      },
      objectives: []
    },
    teamFightSummary: {
      totalTeamFights: 0,
      myTeamWins: 0,
      enemyTeamWins: 0,
      majorFights: []
    }
  }

  // 全プレイヤーの詳細統計
  const allPlayers = [...myTeam, ...enemyTeam]
  const gameDurationMinutes = gameInfo.gameDuration / 60

  const createPlayerDetailedStats = (player: ParticipantWithRank): PlayerDetailedStats => {
    const kda = player.deaths === 0 ? player.kills + player.assists : (player.kills + player.assists) / player.deaths
    const teamKills = player.teamId === teamStats.myTeam.teamId ? teamPerformance.myTeam.totalKills : teamPerformance.enemyTeam.totalKills
    const killParticipation = teamKills > 0 ? ((player.kills + player.assists) / teamKills) * 100 : 0
    const totalTeamDamage = player.teamId === teamStats.myTeam.teamId ? teamPerformance.myTeam.totalDamageToChampions : teamPerformance.enemyTeam.totalDamageToChampions
    const damageShare = totalTeamDamage > 0 ? (player.totalDamageDealtToChampions / totalTeamDamage) * 100 : 0

    return {
      championName: player.championName,
      championId: player.championId,
      teamId: player.teamId,
      performance: {
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        kda: Math.round(kda * 100) / 100,
        killParticipation: Math.round(killParticipation)
      },
      damage: {
        totalDamageToChampions: player.totalDamageDealtToChampions,
        physicalDamage: player.physicalDamageDealtToChampions,
        magicDamage: player.magicDamageDealtToChampions,
        trueDamage: player.trueDamageDealtToChampions,
        damageTaken: player.totalDamageTaken,
        damageShare: Math.round(damageShare)
      },
      economy: {
        goldEarned: player.goldEarned,
        totalMinionsKilled: player.totalMinionsKilled,
        goldPerMinute: Math.round(player.goldEarned / gameDurationMinutes),
        csPerMinute: Math.round((player.totalMinionsKilled / gameDurationMinutes) * 10) / 10
      },
      vision: {
        wardsPlaced: 0,
        wardsKilled: 0,
        visionScore: 0
      },
      rank: player.rank ? {
        tier: player.rank.tier,
        rank: player.rank.rank,
        leaguePoints: player.rank.leaguePoints,
        winRate: player.rank.wins > 0 ? Math.round((player.rank.wins / (player.rank.wins + player.rank.losses)) * 100) : 0
      } : null
    }
  }

  const allPlayersStats = allPlayers.map(createPlayerDetailedStats)

  // トッププレイヤー統計
  const createPlayerSummaryStats = (player: PlayerDetailedStats): PlayerSummaryStats => ({
    championName: player.championName,
    teamId: player.teamId,
    kda: `${player.performance.kills}/${player.performance.deaths}/${player.performance.assists}`,
    damage: player.damage.totalDamageToChampions,
    gold: player.economy.goldEarned,
    rank: player.rank ? `${player.rank.tier} ${player.rank.rank}` : 'Unranked'
  })

  // 配列が空でないことを保証
  if (allPlayersStats.length === 0) {
    throw new Error('プレイヤー統計データが生成できませんでした')
  }

  const sortedByKDA = [...allPlayersStats].sort((a, b) => b.performance.kda - a.performance.kda)
  const sortedByDamage = [...allPlayersStats].sort((a, b) => b.damage.totalDamageToChampions - a.damage.totalDamageToChampions)
  const sortedByKills = [...allPlayersStats].sort((a, b) => b.performance.kills - a.performance.kills)
  const sortedByWorstKDA = [...allPlayersStats].sort((a, b) => a.performance.kda - b.performance.kda)

  const topPlayers: TopPlayerStats = {
    mvp: createPlayerSummaryStats(sortedByKDA[0]!),
    mostDamage: createPlayerSummaryStats(sortedByDamage[0]!),
    mostKills: createPlayerSummaryStats(sortedByKills[0]!),
    highestKDA: createPlayerSummaryStats(sortedByKDA[0]!),
    worstPerformer: createPlayerSummaryStats(sortedByWorstKDA[0]!)
  }

  // 既に特定済みのmyParticipantを使用
  const myPlayerStats = createPlayerDetailedStats(myParticipant)

  return {
    matchId,
    gameBasicInfo,
    teamPerformance,
    gameTimeline,
    playerDetailedStats: {
      topPlayers,
      myPlayerStats,
      allPlayersStats
    }
  }
}

export default defineEventHandler(async (event): Promise<MatchDetail> => {
  try {
    // リクエストボディを取得
    const body = await readBody(event)
    const { puuid, matchId } = body

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
    
    console.log('Debug - 試合詳細情報を取得します, PUUID:', puuid.substring(0, 20) + '...', matchId ? `matchId: ${matchId}` : '最新試合')

    // Riot API マネージャーを初期化
    const riotApi = new RiotApiManager(apiKey)

    let targetMatchId: string

    // matchIdが指定されている場合はそれを使用、なければ最新試合を取得
    if (matchId) {
      targetMatchId = matchId
      console.log('Debug - 指定された試合ID:', targetMatchId)
    } else {
      // 1. Match List API で最新の試合IDを取得
      console.log('Debug - Getting latest match ID')
      const matchIds = await riotApi.getMatchIds(puuid, 0, 1)
      
      if (!matchIds || matchIds.length === 0) {
        throw createError({
          statusCode: 404,
          message: '試合履歴が見つかりません'
        })
      }

      const latestMatchId = matchIds[0]
      if (!latestMatchId) {
        throw createError({
          statusCode: 404,
          message: '最新試合IDが取得できませんでした'
        })
      }
      targetMatchId = latestMatchId
      console.log('Debug - 最新試合ID:', targetMatchId)
    }

    // 2. Match Detail API で試合詳細を取得
    console.log('Debug - Getting match detail for:', targetMatchId)
    const matchDetail = await riotApi.getMatchDetail(targetMatchId)

    console.log('Debug - 試合詳細取得完了:', {
      matchId: targetMatchId,
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
        const rankInfo = await riotApi.getLeagueEntries(participant.puuid)
        
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
          // ダメージ関連データを明示的に追加
          totalDamageDealt: participant.totalDamageDealt || 0,
          totalDamageDealtToChampions: participant.totalDamageDealtToChampions || 0,
          physicalDamageDealt: participant.physicalDamageDealt || 0,
          physicalDamageDealtToChampions: participant.physicalDamageDealtToChampions || 0,
          magicDamageDealt: participant.magicDamageDealt || 0,
          magicDamageDealtToChampions: participant.magicDamageDealtToChampions || 0,
          trueDamageDealt: participant.trueDamageDealt || 0,
          trueDamageDealtToChampions: participant.trueDamageDealtToChampions || 0,
          totalDamageTaken: participant.totalDamageTaken || 0,
          physicalDamageTaken: participant.physicalDamageTaken || 0,
          magicDamageTaken: participant.magicDamageTaken || 0,
          trueDamageTaken: participant.trueDamageTaken || 0,
          totalMinionsKilled: participant.totalMinionsKilled || 0,
          rank: soloRank ? {
            tier: soloRank.tier,
            rank: soloRank.rank,
            leaguePoints: soloRank.leaguePoints,
            wins: soloRank.wins,
            losses: soloRank.losses,
            queueType: soloRank.queueType
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
          // ダメージ関連データを明示的に追加（エラー時も）
          totalDamageDealt: participant.totalDamageDealt || 0,
          totalDamageDealtToChampions: participant.totalDamageDealtToChampions || 0,
          physicalDamageDealt: participant.physicalDamageDealt || 0,
          physicalDamageDealtToChampions: participant.physicalDamageDealtToChampions || 0,
          magicDamageDealt: participant.magicDamageDealt || 0,
          magicDamageDealtToChampions: participant.magicDamageDealtToChampions || 0,
          trueDamageDealt: participant.trueDamageDealt || 0,
          trueDamageDealtToChampions: participant.trueDamageDealtToChampions || 0,
          totalDamageTaken: participant.totalDamageTaken || 0,
          physicalDamageTaken: participant.physicalDamageTaken || 0,
          magicDamageTaken: participant.magicDamageTaken || 0,
          trueDamageTaken: participant.trueDamageTaken || 0,
          totalMinionsKilled: participant.totalMinionsKilled || 0,
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
        message: '試合内でプレイヤーが見つかりません'
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

    // 5. チーム成績・オブジェクト情報を取得
    const teams = matchDetail.info?.teams || []
    console.log('Debug - チーム情報取得:', teams.length + 'チーム')

    const myTeamData = teams.find((team: any) => team.teamId === myTeamId)
    const enemyTeamData = teams.find((team: any) => team.teamId !== myTeamId)

    // チームのトータルゴールドを計算
    const myTeamTotalGold = myTeam.reduce((total: number, player: any) => total + (player.goldEarned || 0), 0)
    const enemyTeamTotalGold = enemyTeam.reduce((total: number, player: any) => total + (player.goldEarned || 0), 0)

    const teamStats: TeamStats = {
      myTeam: {
        teamId: myTeamData?.teamId || myTeamId,
        win: myTeamData?.win || false,
        objectives: {
          baron: myTeamData?.objectives?.baron || { first: false, kills: 0 },
          champion: myTeamData?.objectives?.champion || { first: false, kills: 0 },
          dragon: myTeamData?.objectives?.dragon || { first: false, kills: 0 },
          horde: myTeamData?.objectives?.horde || { first: false, kills: 0 },
          inhibitor: myTeamData?.objectives?.inhibitor || { first: false, kills: 0 },
          riftHerald: myTeamData?.objectives?.riftHerald || { first: false, kills: 0 },
          tower: myTeamData?.objectives?.tower || { first: false, kills: 0 }
        },
        totalGold: myTeamTotalGold
      },
      enemyTeam: {
        teamId: enemyTeamData?.teamId || (myTeamId === 100 ? 200 : 100),
        win: enemyTeamData?.win || false,
        objectives: {
          baron: enemyTeamData?.objectives?.baron || { first: false, kills: 0 },
          champion: enemyTeamData?.objectives?.champion || { first: false, kills: 0 },
          dragon: enemyTeamData?.objectives?.dragon || { first: false, kills: 0 },
          horde: enemyTeamData?.objectives?.horde || { first: false, kills: 0 },
          inhibitor: enemyTeamData?.objectives?.inhibitor || { first: false, kills: 0 },
          riftHerald: enemyTeamData?.objectives?.riftHerald || { first: false, kills: 0 },
          tower: enemyTeamData?.objectives?.tower || { first: false, kills: 0 }
        },
        totalGold: enemyTeamTotalGold
      }
    }

    console.log('Debug - チーム成績取得完了:', {
      myTeamWin: teamStats.myTeam.win,
      myTeamKills: teamStats.myTeam.objectives.champion.kills,
      enemyTeamKills: teamStats.enemyTeam.objectives.champion.kills,
      myTeamTowers: teamStats.myTeam.objectives.tower.kills,
      enemyTeamTowers: teamStats.enemyTeam.objectives.tower.kills,
      myTeamGold: teamStats.myTeam.totalGold,
      enemyTeamGold: teamStats.enemyTeam.totalGold
    })

    // タイムライン情報を取得（内部API呼び出し）
    let timelineEvents: TimelineEvent[] = []
    try {
      console.log('Debug - タイムライン情報取得開始')
      const timelineResponse = await $fetch('/api/match/timeline', {
        method: 'POST',
        body: {
          matchId: targetMatchId,
          matchData: { myTeam, enemyTeam, myParticipant }
        }
      })
      
      if (timelineResponse.success && timelineResponse.data.events) {
        timelineEvents = timelineResponse.data.events
        console.log('Debug - タイムライン情報取得完了:', timelineEvents.length + '件のイベント')
      }
    } catch (timelineError: any) {
      console.warn('Debug - タイムライン情報取得失敗:', timelineError.message)
      // タイムライン取得失敗は非致命的エラーとして続行
    }

    // まとめ情報を生成
    const analysisSummary = generateMatchAnalysisSummary(
      targetMatchId,
      matchDetail.info,
      myTeam,
      enemyTeam,
      myParticipant,
      teamStats
    )

    console.log('Debug - 試合分析サマリー生成完了:', {
      matchResult: analysisSummary.gameBasicInfo.matchResult,
      myTeamKills: analysisSummary.teamPerformance.myTeam.totalKills,
      enemyTeamKills: analysisSummary.teamPerformance.enemyTeam.totalKills,
      mvpPlayer: analysisSummary.playerDetailedStats.topPlayers.mvp.championName,
      myPlayerKDA: `${analysisSummary.playerDetailedStats.myPlayerStats.performance.kills}/${analysisSummary.playerDetailedStats.myPlayerStats.performance.deaths}/${analysisSummary.playerDetailedStats.myPlayerStats.performance.assists}`
    })

    // レスポンスデータを整形
    const result: MatchDetail = {
      matchId: targetMatchId,
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
      myParticipant: myParticipant,
      teamStats: teamStats,
      analysisSummary: analysisSummary,
      timelineEvents: timelineEvents
    }

    return result

  } catch (error: any) {
    console.error('最新試合情報取得エラー:', error)
    
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
        message: '試合情報が見つかりません。'
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
