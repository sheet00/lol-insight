// Riot Games API 関連の型定義

export interface SummonerInfo {
  id: string
  accountId: string
  puuid: string
  name: string
  profileIconId: number
  revisionDate: number
  summonerLevel: number
}

export interface MatchInfo {
  matchId: string
  gameCreation: number
  gameDuration: number
  gameMode: string
  gameType: string
  gameVersion: string
  mapId: number
  participants: Participant[]
  teams: Team[]
}

export interface Participant {
  championId: number
  championName: string
  summonerName: string
  kills: number
  deaths: number
  assists: number
  totalDamageDealt: number
  goldEarned: number
  win: boolean
}

export interface Team {
  teamId: number
  win: boolean
  bans: Ban[]
}

export interface Ban {
  championId: number
  pickTurn: number
}

// AI アドバイス関連
export interface AIAdvice {
  id: string
  summoner: string
  matchType: string
  advice: string
  confidence: number
  createdAt: string
  categories: AdviceCategory[]
}

export interface AdviceCategory {
  category: 'champion' | 'itemization' | 'positioning' | 'macro' | 'micro'
  priority: 'high' | 'medium' | 'low'
  description: string
}