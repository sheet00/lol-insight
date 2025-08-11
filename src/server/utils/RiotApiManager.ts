/**
 * Riot API リクエスト管理クラス
 * Rate Limitを考慮してリクエストを一元管理
 */
export class RiotApiManager {
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessing = false
  private lastRequestTime = 0
  private requestCount = 0
  private requestCountWindow = 0
  private readonly RATE_LIMIT_PER_SECOND = 19 // 20から少し余裕を持たせる
  private readonly RATE_LIMIT_PER_2MINUTES = 95 // 100から少し余裕を持たせる
  private readonly DELAY_BETWEEN_REQUESTS = 60 // 60ms間隔

  constructor(private apiKey: string) {}

  /**
   * Riot APIへのリクエストをキューに追加
   */
  async request<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestTask = async () => {
        try {
          const response = await $fetch<T>(url)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      }

      this.requestQueue.push(requestTask)
      this.processQueue()
    })
  }

  /**
   * キューを処理する
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      await this.waitForRateLimit()
      
      const task = this.requestQueue.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          console.warn('RiotApiManager: リクエスト実行エラー:', error)
        }
      }
    }

    this.isProcessing = false
  }

  /**
   * Rate Limitを考慮した待機処理
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()

    // 2分間のウィンドウをリセット
    if (now - this.requestCountWindow > 120000) {
      this.requestCount = 0
      this.requestCountWindow = now
    }

    // Rate Limit チェック
    if (this.requestCount >= this.RATE_LIMIT_PER_2MINUTES) {
      const waitTime = 120000 - (now - this.requestCountWindow)
      console.log(`RiotApiManager: 2分間のRate Limitに達しました。${waitTime}ms待機します`)
      await this.sleep(waitTime)
      this.requestCount = 0
      this.requestCountWindow = Date.now()
    }

    // 前回のリクエストから十分時間が経過しているかチェック
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.DELAY_BETWEEN_REQUESTS) {
      await this.sleep(this.DELAY_BETWEEN_REQUESTS - timeSinceLastRequest)
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * League API - PUUIDでランク情報取得
   */
  async getLeagueEntries(puuid: string): Promise<any[]> {
    const url = `https://jp1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${this.apiKey}`
    return this.request<any[]>(url)
  }

  /**
   * Summoner API - PUUIDでサモナー情報取得
   */
  async getSummonerByPuuid(puuid: string): Promise<any> {
    const url = `https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${this.apiKey}`
    return this.request<any>(url)
  }

  /**
   * Spectator API - 進行中試合情報取得
   */
  async getCurrentGame(puuid: string): Promise<any> {
    const url = `https://jp1.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${this.apiKey}`
    return this.request<any>(url)
  }

  /**
   * Account API - Riot IDからPUUID取得
   */
  async getAccountByRiotId(gameName: string, tagLine: string): Promise<any> {
    const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    return $fetch<any>(url, {
      headers: {
        'X-Riot-Token': this.apiKey
      }
    })
  }

  /**
   * Challenges API - プレイヤーチャレンジデータ取得
   */
  async getPlayerChallenges(puuid: string): Promise<any> {
    const url = `https://jp1.api.riotgames.com/lol/challenges/v1/player-data/${puuid}?api_key=${this.apiKey}`
    return this.request<any>(url)
  }

  /**
   * Match API - 試合履歴ID取得
   */
  async getMatchIds(puuid: string, start: number = 0, count: number = 1): Promise<string[]> {
    const url = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`
    return $fetch<string[]>(url, {
      headers: {
        'X-Riot-Token': this.apiKey
      }
    })
  }

  /**
   * Match API - 試合詳細取得
   */
  async getMatchDetail(matchId: string): Promise<any> {
    const url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`
    return $fetch<any>(url, {
      headers: {
        'X-Riot-Token': this.apiKey
      }
    })
  }
}