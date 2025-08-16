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
  teamStats: TeamStats
  analysisSummary?: MatchAnalysisSummary
  timelineEvents?: TimelineEvent[]
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
  totalDamageDealtToChampions: number
  physicalDamageDealt: number
  physicalDamageDealtToChampions: number
  magicDamageDealt: number
  magicDamageDealtToChampions: number
  trueDamageDealt: number
  trueDamageDealtToChampions: number
  totalDamageTaken: number
  physicalDamageTaken: number
  magicDamageTaken: number
  trueDamageTaken: number
  totalMinionsKilled: number
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
  winRate: number
  queueType: string
}

// チーム成績・オブジェクト情報の型
export interface TeamStats {
  myTeam: TeamInfo
  enemyTeam: TeamInfo
}

export interface TeamInfo {
  teamId: number
  win: boolean
  objectives: TeamObjectives
  totalGold: number
}

export interface TeamObjectives {
  baron: ObjectiveInfo
  champion: ObjectiveInfo
  dragon: ObjectiveInfo
  horde: ObjectiveInfo
  inhibitor: ObjectiveInfo
  riftHerald: ObjectiveInfo
  tower: ObjectiveInfo
}

export interface ObjectiveInfo {
  first: boolean
  kills: number
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
  // 進行中試合表示用フラグ
  isHighestWinRate?: boolean
  isLowestWinRate?: boolean
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

// 試合履歴リスト用の型
export interface MatchHistoryItem {
  matchId: string
  gameMode: string
  queueId: number
  gameCreation: number
  gameDuration: number
  myChampion: string
  result: 'WIN' | 'LOSE'
  kda: string
  gameEndTimestamp: number
}

// 試合履歴レスポンス型
export interface MatchHistoryResponse {
  matches: MatchHistoryItem[]
  hasMore: boolean
  currentPage: number
  totalMatches?: number
}

// 完了試合分析まとめ情報の型
export interface MatchAnalysisSummary {
  matchId: string
  gameBasicInfo: {
    gameMode: string
    queueId: number
    gameDuration: number
    gameEndTimestamp: number
    gameVersion: string
    matchResult: 'WIN' | 'LOSE'
  }
  teamPerformance: {
    myTeam: TeamSummary
    enemyTeam: TeamSummary
  }
  gameTimeline: {
    objectives: ObjectiveTimeline
    teamFightSummary: TeamFightSummary
  }
  playerDetailedStats: {
    topPlayers: TopPlayerStats
    myPlayerStats: PlayerDetailedStats
    allPlayersStats: PlayerDetailedStats[]
  }
}

export interface TeamSummary {
  teamId: number
  win: boolean
  totalKills: number
  totalDeaths: number
  totalAssists: number
  totalGold: number
  totalDamageToChampions: number
  averageLevel: number
  objectives: {
    towers: number
    dragons: number
    barons: number
    heralds: number
    inhibitors: number
  }
}

export interface ObjectiveTimeline {
  firstBlood: {
    team: 'my' | 'enemy'
    time: number
    player?: string
  }
  objectives: Array<{
    type: 'tower' | 'dragon' | 'baron' | 'herald' | 'inhibitor'
    team: 'my' | 'enemy'
    time: number
    location?: string
  }>
}

export interface TeamFightSummary {
  totalTeamFights: number
  myTeamWins: number
  enemyTeamWins: number
  majorFights: Array<{
    time: number
    winner: 'my' | 'enemy'
    kills: { my: number, enemy: number }
    location: string
  }>
}

export interface TopPlayerStats {
  mvp: PlayerSummaryStats
  mostDamage: PlayerSummaryStats
  mostKills: PlayerSummaryStats
  highestKDA: PlayerSummaryStats
  worstPerformer: PlayerSummaryStats
}

export interface PlayerSummaryStats {
  championName: string
  teamId: number
  kda: string
  damage: number
  gold: number
  rank?: string
}

export interface PlayerDetailedStats {
  championName: string
  championId: number
  teamId: number
  performance: {
    kills: number
    deaths: number
    assists: number
    kda: number
    killParticipation: number
  }
  damage: {
    totalDamageToChampions: number
    physicalDamage: number
    magicDamage: number
    trueDamage: number
    damageTaken: number
    damageShare: number
  }
  economy: {
    goldEarned: number
    totalMinionsKilled: number
    goldPerMinute: number
    csPerMinute: number
  }
  vision: {
    wardsPlaced?: number
    wardsKilled?: number
    visionScore?: number
  }
  rank: {
    tier?: string
    rank?: string
    leaguePoints?: number
    winRate?: number
  } | null
}

// タイムラインイベントの型
export interface TimelineEvent {
  type: string
  timestamp: number
  timeString: string
  frameIndex: number
  description: string
  priority: number
  killerId?: number
  victimId?: number
  assistingParticipantIds?: number[]
  position?: any
  buildingType?: string
  teamId?: number
  monsterType?: string
  itemId?: number
  participantId?: number
  level?: number
  laneType?: string
  killerTeam?: string
  victimTeam?: string
  attackerTeam?: string
  teamSide?: string
  itemName?: string
  purchaserName?: string
  purchaserTeam?: string
}
