// Riot Games API 関連の型定義

// Account API レスポンス型
export interface RiotAccount {
  puuid: string
  gameName: string
  tagLine: string
}

// Summoner API レスポンス型
export interface SummonerInfo {
  id?: string
  accountId?: string
  puuid: string
  name?: string
  profileIconId: number
  revisionDate: number
  summonerLevel: number
}

// League API レスポンス型
export interface LeagueEntry {
  leagueId: string
  summonerId: string
  summonerName: string
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
  hotStreak: boolean
  veteran: boolean
  freshBlood: boolean
  inactive: boolean
  miniSeries?: MiniSeries
}

export interface MiniSeries {
  losses: number
  progress: string
  target: number
  wins: number
}

// サモナー検索結果の型
export interface SummonerSearchResult {
  account: {
    puuid: string
    gameName: string
    tagLine: string
  }
  leagues: LeagueEntry[]
  challenges: ChallengesData | null
}

// Challenges API レスポンス型
export interface ChallengesData {
  totalPoints: {
    level: string
    current: number
    max: number
    percentile: number
  }
  categoryPoints: {
    TEAMWORK: CategoryPoint
    IMAGINATION: CategoryPoint
    EXPERTISE: CategoryPoint
    VETERANCY: CategoryPoint
    COLLECTION: CategoryPoint
  }
  challenges: Challenge[]
  preferences: {
    bannerAccent: string
    title: string
    challengeIds: number[]
    crestBorder: string
    prestigeCrestBorderLevel: number
  }
}

export interface CategoryPoint {
  level: string
  current: number
  max: number
  percentile: number
}

export interface Challenge {
  challengeId: number
  percentile: number
  level: string
  value: number
  achievedTime?: number
  position?: number
  playersInLevel?: number
}

// 試合詳細情報の型
export interface MatchDetail {
  matchId: string
  gameInfo: GameInfo
  myTeam: ParticipantWithRank[]
  enemyTeam: ParticipantWithRank[]
  myParticipant: ParticipantWithRank
}

export interface GameInfo {
  gameMode: string
  queueId: number
  gameDuration: number
  gameCreation: number
  gameEndTimestamp: number
  gameVersion: string
}

export interface ParticipantWithRank {
  puuid: string
  summonerName: string
  championId: number
  championName: string
  teamId: number
  kills: number
  deaths: number
  assists: number
  win: boolean
  totalDamageDealt: number
  goldEarned: number
  rank: RankInfo | null
  summonerLevel: number
}

export interface RankInfo {
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
  queueType: string
}

// 進行中試合詳細情報の型
export interface LiveMatchDetail {
  gameId: number
  gameInfo: LiveGameInfo
  myTeam: LiveParticipant[]
  enemyTeam: LiveParticipant[]
  myParticipant: LiveParticipant
  bannedChampions: BannedChampion[]
  observers: Observer
  teamAverages: TeamAverages
}

export interface TeamAverages {
  myTeam: TeamAverage
  enemyTeam: TeamAverage
}

export interface TeamAverage {
  averageRank: string
  tierScore: number
}

export interface LiveGameInfo {
  gameMode: string
  queueId: number
  gameStartTime: number
  gameLength: number
  mapId: number
  platformId: string
}

export interface LiveParticipant {
  puuid: string
  championId: number
  teamId: number
  spell1Id: number
  spell2Id: number
  profileIconId: number
  bot: boolean
  perks: Perks
  rank: RankInfo | null
  summonerLevel: number
}

export interface BannedChampion {
  pickTurn: number
  championId: number
  teamId: number
}

export interface Observer {
  encryptionKey: string
}

export interface Perks {
  perkIds: number[]
  perkStyle: number
  perkSubStyle: number
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