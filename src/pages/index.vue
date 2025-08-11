<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-16">
      <!-- ヘッダー -->
      <header class="bg-white shadow-sm border-b mb-8">
        <div class="container mx-auto px-4 py-6">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                LoL Insight
              </h1>
              <p class="text-gray-600 mt-1">
                最新試合のマッチアップを分析
              </p>
            </div>
            
            <!-- 検索フォーム（ヘッダー内） -->
            <form @submit.prevent="searchSummoner" class="flex flex-col sm:flex-row gap-2 max-w-md w-full lg:w-auto">
              <div class="flex gap-2">
                <input
                  v-model="searchForm.summonerName"
                  type="text"
                  required
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="ゲーム名"
                />
                <input
                  v-model="searchForm.tagLine"
                  type="text"
                  required
                  class="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="JP1"
                />
              </div>
              <button
                type="submit"
                :disabled="loading"
                class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm px-4 py-2"
              >
                <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ loading ? '分析中...' : 'マッチ分析' }}
              </button>
            </form>
          </div>
        </div>
      </header>

      <!-- メインコンテンツ -->
      <div class="max-w-7xl mx-auto">

        <!-- 分析対象プレイヤー表示 -->
        <div v-if="summonerData && !matchData && !liveMatchData" class="card text-center">
          <div class="py-8">
            <div class="text-2xl font-bold text-gray-900 mb-2">
              {{ summonerData.account.gameName }}#{{ summonerData.account.tagLine }}
            </div>
            <div class="text-gray-600 mb-4">
              プレイヤーの試合情報を分析中...
            </div>
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>

        <!-- 進行中試合分析結果 -->
        <div v-if="liveMatchData" class="space-y-6">
          <!-- 進行中試合ヘッダー -->
          <div class="card">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold animate-pulse">
                  🔴
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <span>進行中の試合</span>
                    <span class="text-green-600 text-sm font-normal">LIVE</span>
                  </h2>
                  <p class="text-gray-600">
                    {{ formatGameMode(liveMatchData.gameInfo.queueId) }} - {{ formatGameTime(liveMatchData.gameInfo.gameLength) }}経過
                  </p>
                </div>
              </div>
              
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">
                  進行中
                </div>
                <div class="text-sm text-gray-500">ゲーム状況</div>
              </div>
            </div>
            
            <!-- Ban情報 -->
            <div v-if="liveMatchData.bannedChampions.length > 0" class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">Ban されたチャンピオン</h4>
              <div class="flex flex-wrap gap-2">
                <div v-for="ban in liveMatchData.bannedChampions" :key="`${ban.teamId}-${ban.championId}`"
                     class="text-xs px-2 py-1 rounded"
                     :class="ban.teamId === liveMatchData.myParticipant.teamId ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'">
                  {{ getChampionName(ban.championId) }}
                </div>
              </div>
            </div>
          </div>

          <!-- ライブマッチアップ詳細 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 味方チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-blue-600">
                  味方チーム
                </h3>
                <div class="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  あなたのチーム
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in liveMatchData.myTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 rounded-lg transition-colors"
                     :class="player.puuid === liveMatchData.myParticipant.puuid ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'">
                  <div>
                    <div class="font-medium text-gray-900">{{ getChampionName(player.championId) }}</div>
                    <div class="text-sm text-gray-600">{{ getSummonerSpellName(player.spell1Id) }}/{{ getSummonerSpellName(player.spell2Id) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs" :class="player.rank ? 'text-blue-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `レベル${player.summonerLevel || 0}` }}
                    </div>
                    <div v-if="player.rank" class="text-xs text-gray-500" :title="`${player.rank.queueType}の戦績`">
                      Win {{ player.rank.wins }} Lose {{ player.rank.losses }} ({{ player.rank.queueType }})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 敵チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-red-600">
                  敵チーム
                </h3>
                <div class="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-800">
                  相手チーム
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in liveMatchData.enemyTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div class="font-medium text-gray-900">{{ getChampionName(player.championId) }}</div>
                    <div class="text-sm text-gray-600">{{ getSummonerSpellName(player.spell1Id) }}/{{ getSummonerSpellName(player.spell2Id) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs" :class="player.rank ? 'text-red-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `レベル${player.summonerLevel || 0}` }}
                    </div>
                    <div v-if="player.rank" class="text-xs text-gray-500" :title="`${player.rank.queueType}の戦績`">
                      Win {{ player.rank.wins }} Lose {{ player.rank.losses }} ({{ player.rank.queueType }})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 過去試合分析結果 -->
        <div v-if="matchData" class="space-y-6">
          <!-- 分析対象プレイヤーとゲーム情報 -->
          <div class="card">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  🎮
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-900">
                    {{ matchData.myParticipant.summonerName }}
                  </h2>
                  <p class="text-gray-600">
                    {{ matchData.myParticipant.championName }} - {{ formatGameMode(matchData.gameInfo.queueId) }}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center space-x-6">
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="matchData.myParticipant.win ? 'text-green-600' : 'text-red-600'">
                    {{ matchData.myParticipant.win ? '勝利' : '敗北' }}
                  </div>
                  <div class="text-sm text-gray-500">結果</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-800">
                    {{ matchData.myParticipant.kills }}/{{ matchData.myParticipant.deaths }}/{{ matchData.myParticipant.assists }}
                  </div>
                  <div class="text-sm text-gray-500">KDA</div>
                </div>
              </div>
            </div>
          </div>

          <!-- マッチアップ詳細 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 味方チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold" :class="matchData.myParticipant.win ? 'text-blue-600' : 'text-gray-600'">
                  味方チーム
                </h3>
                <div class="text-sm font-medium px-3 py-1 rounded-full"
                     :class="matchData.myParticipant.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ matchData.myParticipant.win ? '勝利' : '敗北' }}
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in matchData.myTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 rounded-lg transition-colors"
                     :class="player.puuid === matchData.myParticipant.puuid ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'">
                  <div>
                    <div class="font-medium text-gray-900">{{ player.summonerName }}</div>
                    <div class="text-sm text-gray-600">{{ player.championName }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
                    </div>
                    <div class="text-xs" :class="player.rank ? 'text-blue-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `Lv.${player.summonerLevel}` }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 敵チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold" :class="!matchData.myParticipant.win ? 'text-red-600' : 'text-gray-600'">
                  敵チーム
                </h3>
                <div class="text-sm font-medium px-3 py-1 rounded-full"
                     :class="!matchData.myParticipant.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ !matchData.myParticipant.win ? '勝利' : '敗北' }}
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in matchData.enemyTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div class="font-medium text-gray-900">{{ player.summonerName }}</div>
                    <div class="text-sm text-gray-600">{{ player.championName }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
                    </div>
                    <div class="text-xs" :class="player.rank ? 'text-red-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `レベル${player.summonerLevel || 0}` }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- エラー表示 -->
        <div v-if="error" class="card bg-red-50 border-red-200">
          <div class="flex items-center">
            <div class="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 class="text-lg font-semibold text-red-800">エラーが発生しました</h3>
              <p class="text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/main.css"
import type { SummonerSearchResult, MatchDetail, LiveMatchDetail } from '~/types'

// リアクティブデータ
const searchForm = ref({
  summonerName: 'shaat00',
  tagLine: 'JP1'
})

const loading = ref(false)
const loadingMatch = ref(false)
const summonerData = ref<SummonerSearchResult | null>(null)
const matchData = ref<MatchDetail | null>(null)
const liveMatchData = ref<LiveMatchDetail | null>(null)
const error = ref('')

// サモナー検索処理
const searchSummoner = async () => {
  if (!searchForm.value.summonerName.trim() || !searchForm.value.tagLine.trim()) {
    error.value = 'サモナー名とタグラインを入力してください'
    return
  }

  loading.value = true
  error.value = ''
  summonerData.value = null

  try {
    // APIエンドポイントにリクエスト
    const response = await $fetch<SummonerSearchResult>('/api/summoner/search', {
      method: 'POST',
      body: {
        summonerName: searchForm.value.summonerName.trim(),
        tagLine: searchForm.value.tagLine.trim()
      }
    })

    summonerData.value = response
    
    // プレイヤー情報取得成功後、まず進行中試合をチェック
    try {
      console.log('プレイヤー情報取得成功、進行中試合をチェック中...')
      await getLiveMatchInternal(response.account.puuid)
    } catch (liveError) {
      console.log('進行中試合なし、過去試合を取得中...')
      // 進行中試合がない場合、過去の試合を取得
      try {
        await getLatestMatchInternal(response.account.puuid)
      } catch (matchError) {
        console.warn('過去試合情報の取得にも失敗:', matchError)
        matchData.value = null
        liveMatchData.value = null
      }
    }
  } catch (err: any) {
    console.error('サモナー検索エラー:', err)
    
    // エラー内容を詳しく表示
    let errorMessage = 'サモナー情報の取得に失敗しました'
    
    if (err.data?.message) {
      errorMessage = err.data.message
    } else if (err.statusMessage) {
      errorMessage = err.statusMessage
    } else if (err.message) {
      errorMessage = err.message
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    
    // ステータスコードも表示
    if (err.status || err.statusCode) {
      const statusCode = err.status || err.statusCode
      errorMessage = `[${statusCode}] ${errorMessage}`
    }
    
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

// 進行中試合情報取得処理（内部用）
const getLiveMatchInternal = async (puuid: string) => {
  // 進行中試合情報APIにリクエスト
  const response = await $fetch<LiveMatchDetail>('/api/match/live', {
    method: 'POST',
    body: {
      puuid: puuid
    }
  })

  liveMatchData.value = response
  matchData.value = null // 進行中試合がある場合は過去試合データをクリア
  console.log('進行中試合情報取得成功:', response)
}

// 最新試合情報取得処理（内部用）
const getLatestMatchInternal = async (puuid: string) => {
  // 最新試合情報APIにリクエスト
  const response = await $fetch<MatchDetail>('/api/match/latest', {
    method: 'POST',
    body: {
      puuid: puuid
    }
  })

  matchData.value = response
  liveMatchData.value = null // 過去試合がある場合は進行中試合データをクリア
  console.log('最新試合情報取得成功:', response)
}

// 最新試合情報取得処理（ボタン用）
const getLatestMatch = async () => {
  if (!summonerData.value) {
    error.value = 'まずプレイヤー情報を取得してください'
    return
  }

  loadingMatch.value = true
  error.value = ''

  try {
    await getLatestMatchInternal(summonerData.value.account.puuid)
  } catch (err: any) {
    console.error('最新試合情報取得エラー:', err)
    
    // エラー内容を詳しく表示
    let errorMessage = '最新試合情報の取得に失敗しました'
    
    if (err.data?.message) {
      errorMessage = err.data.message
    } else if (err.statusMessage) {
      errorMessage = err.statusMessage
    } else if (err.message) {
      errorMessage = err.message
    } else if (typeof err === 'string') {
      errorMessage = err
    }
    
    // ステータスコードも表示
    if (err.status || err.statusCode) {
      const statusCode = err.status || err.statusCode
      errorMessage = `[${statusCode}] ${errorMessage}`
    }
    
    error.value = errorMessage
  } finally {
    loadingMatch.value = false
  }
}

// ゲームモード表示用関数
const formatGameMode = (queueId: number) => {
  const queueMap: { [key: number]: string } = {
    420: 'ランクソロ/デュオ',
    440: 'ランクフレックス',
    450: 'ARAM',
    480: 'カジュアル',
    830: 'Co-op vs AI',
    400: 'ノーマルドラフト',
    430: 'ノーマルブラインド'
  }
  return queueMap[queueId] || `ゲームモード (${queueId})`
}

// ゲーム時間表示用関数
const formatGameTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// チャンピオン名取得関数
const getChampionName = (championId: number) => {
  const championMap: { [key: number]: string } = {
    // 主要チャンピオンのマッピング
    1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
    6: 'Urgot', 7: 'LeBlanc', 8: 'Vladimir', 9: 'Fiddlesticks', 10: 'Kayle',
    11: 'Master Yi', 12: 'Alistar', 13: 'Ryze', 14: 'Sion', 15: 'Sivir',
    16: 'Soraka', 17: 'Teemo', 18: 'Tristana', 19: 'Warwick', 20: 'Nunu',
    21: 'Miss Fortune', 22: 'Ashe', 23: 'Tryndamere', 24: 'Jax', 25: 'Morgana',
    26: 'Zilean', 27: 'Singed', 28: 'Evelynn', 29: 'Twitch', 30: 'Karthus',
    31: "Cho'Gath", 32: 'Amumu', 33: 'Rammus', 34: 'Anivia', 35: 'Shaco',
    36: 'Dr. Mundo', 37: 'Sona', 38: 'Kassadin', 39: 'Irelia', 40: 'Janna',
    41: 'Gangplank', 42: 'Corki', 43: 'Karma', 44: 'Taric', 45: 'Veigar',
    48: 'Trundle', 50: 'Swain', 51: 'Caitlyn', 53: 'Blitzcrank', 54: 'Malphite',
    55: 'Katarina', 56: 'Nocturne', 57: 'Maokai', 58: 'Renekton', 59: 'Jarvan IV',
    60: 'Elise', 61: 'Orianna', 62: 'Wukong', 63: 'Brand', 64: 'Lee Sin',
    67: 'Vayne', 68: 'Rumble', 69: 'Cassiopeia', 72: 'Skarner', 74: 'Heimerdinger',
    75: 'Nasus', 76: 'Nidalee', 77: 'Udyr', 78: 'Poppy', 79: 'Gragas',
    80: 'Pantheon', 81: 'Ezreal', 82: 'Mordekaiser', 83: 'Yorick', 84: 'Akali',
    85: 'Kennen', 86: 'Garen', 89: 'Leona', 90: 'Malzahar', 91: 'Talon',
    92: 'Riven', 96: "Kog'Maw", 98: 'Shen', 99: 'Lux', 101: 'Xerath',
    102: 'Shyvana', 103: 'Ahri', 104: 'Graves', 105: 'Fizz', 106: 'Volibear',
    107: 'Rengar', 110: 'Varus', 111: 'Nautilus', 112: 'Viktor', 113: 'Sejuani',
    114: 'Fiora', 115: 'Ziggs', 117: 'Lulu', 119: 'Draven', 120: 'Hecarim',
    121: "Kha'Zix", 122: 'Darius', 126: 'Jayce', 127: 'Lissandra', 131: 'Diana',
    133: 'Quinn', 134: 'Syndra', 136: 'Aurelion Sol', 141: 'Kayn', 142: 'Zoe',
    143: 'Zyra', 145: "Kai'Sa", 147: "Seraphine", 150: 'Gnar', 154: 'Zac',
    157: 'Yasuo', 161: "Vel'Koz", 163: 'Taliyah', 164: 'Camille', 166: 'Akshan',
    200: 'Bel\'Veth', 201: 'Braum', 202: 'Jhin', 203: 'Kindred', 221: 'Zeri',
    222: 'Jinx', 223: 'Tahm Kench', 234: 'Viego', 235: 'Senna', 236: 'Lucian',
    238: 'Zed', 240: 'Kled', 245: 'Ekko', 246: 'Qiyana', 254: 'Vi',
    266: 'Aatrox', 267: 'Nami', 268: 'Azir', 350: 'Yuumi', 360: 'Samira',
    412: 'Thresh', 420: 'Illaoi', 421: "Rek'Sai", 427: 'Ivern', 429: 'Kalista',
    432: 'Bard', 516: 'Ornn', 517: 'Sylas', 518: 'Neeko', 523: 'Aphelios',
    526: 'Rell', 555: 'Pyke', 875: 'Sett', 876: 'Lillia', 887: 'Gwen',
    888: 'Renata Glasc', 895: 'Nilah', 897: 'K\'Sante', 901: 'Smolder', 910: 'Hwei', 950: 'Naafiri'
  }
  return championMap[championId] || `Champion ${championId}`
}

// サモナースペル名取得関数
const getSummonerSpellName = (spellId: number) => {
  const spellMap: { [key: number]: string } = {
    1: 'Cleanse', 3: 'Exhaust', 4: 'Flash', 6: 'Ghost', 7: 'Heal',
    11: 'Smite', 12: 'Teleport', 13: 'Clarity', 14: 'Ignite', 21: 'Barrier',
    32: 'Mark/Dash'
  }
  return spellMap[spellId] || `Spell ${spellId}`
}

// メタ情報
useHead({
  title: 'LoL Insight - サモナー検索',
  meta: [
    { 
      name: 'description', 
      content: 'League of Legends プレイヤー情報を検索・分析するツール' 
    }
  ]
})
</script>