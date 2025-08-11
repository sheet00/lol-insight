import type { RiotAccount, SummonerInfo, LeagueEntry, SummonerSearchResult } from '~/types'

export default defineEventHandler(async (event): Promise<SummonerSearchResult> => {
  try {
    // リクエストボディを取得
    const body = await readBody(event)
    const { summonerName, tagLine } = body

    // バリデーション
    if (!summonerName || !tagLine) {
      throw createError({
        statusCode: 400,
        statusMessage: 'サモナー名とタグラインが必要です'
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
    
    console.log('Debug - API Key starts with:', apiKey.substring(0, 15) + '...')

    // 1. Account API でRiot IDからPUUIDを取得
    const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagLine)}`
    console.log('Debug - Making request to:', accountUrl)
    
    const accountResponse = await $fetch<RiotAccount>(accountUrl, {
      headers: {
        'X-Riot-Token': apiKey
      }
    })
    
    console.log('Debug - Account Response:', JSON.stringify(accountResponse, null, 2))

    if (!accountResponse || !accountResponse.puuid) {
      throw createError({
        statusCode: 404,
        statusMessage: 'プレイヤーが見つかりません'
      })
    }

    // 2. Summoner API でサモナー情報を取得
    const summonerUrl = `https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountResponse.puuid}`
    console.log('Debug - Summoner URL:', summonerUrl)
    
    const summonerResponse = await $fetch<SummonerInfo>(summonerUrl, {
      headers: {
        'X-Riot-Token': apiKey
      }
    })
    
    console.log('Debug - Summoner Response:', JSON.stringify(summonerResponse, null, 2))

    // 3. League API でランク情報を取得（idがある場合のみ）
    let leagueResponse: LeagueEntry[] = []
    
    if (summonerResponse.id) {
      const leagueUrl = `https://jp1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerResponse.id}`
      console.log('Debug - League URL:', leagueUrl)
      
      try {
        leagueResponse = await $fetch<LeagueEntry[]>(leagueUrl, {
          headers: {
            'X-Riot-Token': apiKey
          }
        })
        console.log('Debug - League Response:', JSON.stringify(leagueResponse, null, 2))
      } catch (leagueError) {
        console.warn('League API エラー (スキップします):', leagueError)
      }
    } else {
      console.log('Debug - Summoner ID がないため League API をスキップします')
    }

    // レスポンスデータを整形
    const result = {
      account: {
        puuid: accountResponse.puuid,
        gameName: accountResponse.gameName,
        tagLine: accountResponse.tagLine
      },
      summoner: {
        id: summonerResponse.id || null,
        accountId: summonerResponse.accountId || null,
        name: summonerResponse.name || accountResponse.gameName,
        summonerLevel: summonerResponse.summonerLevel,
        profileIconId: summonerResponse.profileIconId
      },
      leagues: leagueResponse
    }

    return result

  } catch (error: any) {
    console.error('Riot API エラー:', error)
    
    // Riot APIのエラーレスポンスを詳しく処理
    if (error.status === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: `APIキーが無効または期限切れです。Riot Developer PortalでAPIキーを確認してください。 (Riot API Error: ${error.statusText})`
      })
    } else if (error.status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: `APIアクセスが拒否されました。APIキーの権限を確認してください。 (Riot API Error: ${error.statusText})`
      })
    } else if (error.status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'プレイヤーが見つかりません。ゲーム名とタグラインを確認してください。'
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
      statusMessage: `予期しないエラーが発生しました: ${error.message || error.statusText || 'Unknown error'} (Status: ${error.status || 'Unknown'})`
    })
  }
})