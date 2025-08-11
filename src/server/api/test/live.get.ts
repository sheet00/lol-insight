import { defineEventHandler, createError } from 'h3'
import { RiotApiManager } from '~/server/utils/RiotApiManager'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const apiKey = (config as any)?.riotApiKey || process.env.RIOT_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'Riot API キーが未設定です' })
  }

  const riot = new RiotApiManager(apiKey)
  try {
    const featured = await riot.getFeaturedGames()
    const games: any[] = featured?.gameList || featured?.game_list || []
    if (!Array.isArray(games) || games.length === 0) {
      throw createError({ statusCode: 404, message: '注目の進行中試合が見つかりませんでした' })
    }
    // 先頭のゲームから先頭の参加者を選ぶ
    const firstGame = games[0]
    const participants: any[] = firstGame?.participants || []
    if (!participants.length) {
      throw createError({ statusCode: 404, message: '参加者情報が見つかりませんでした' })
    }
    const p0 = participants[0]
    let puuid: string | null = p0?.puuid || null
    let summonerName: string | null = p0?.summonerName || null
    // puuid が無ければ、summonerName から取得を試みる
    if (!puuid && summonerName) {
      const s = await riot.getSummonerByName(summonerName)
      puuid = s?.puuid || null
    }
    if (!puuid) {
      throw createError({ statusCode: 500, message: 'テスト用プレイヤーの PUUID 解決に失敗しました' })
    }
    // アカウントから Riot ID を取得
    let gameName: string | null = null
    let tagLine: string | null = null
    try {
      const acc = await riot.getAccountByPuuid(puuid)
      gameName = acc?.gameName || null
      tagLine = acc?.tagLine || null
    } catch {}
    return { puuid, summonerName, gameName, tagLine, sampleGameId: firstGame?.gameId || null }
  } catch (e: any) {
    throw createError({ statusCode: e?.statusCode || 500, message: e?.message || 'テスト用 LIVE データ取得に失敗しました' })
  }
})
