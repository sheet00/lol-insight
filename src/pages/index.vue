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
        <div v-if="summonerData && !matchData" class="card text-center">
          <div class="py-8">
            <div class="text-2xl font-bold text-gray-900 mb-2">
              {{ summonerData.account.gameName }}#{{ summonerData.account.tagLine }}
            </div>
            <div class="text-gray-600 mb-4">
              プレイヤーの最新試合を分析中...
            </div>
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>

        <!-- マッチアップ分析結果 -->
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
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                      {{ player.championName.slice(0, 2) }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{{ player.summonerName }}</div>
                      <div class="text-sm text-gray-600">{{ player.championName }}</div>
                    </div>
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
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                      {{ player.championName.slice(0, 2) }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{{ player.summonerName }}</div>
                      <div class="text-sm text-gray-600">{{ player.championName }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
                    </div>
                    <div class="text-xs" :class="player.rank ? 'text-red-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `Lv.${player.summonerLevel}` }}
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
import type { SummonerSearchResult, MatchDetail } from '~/types'

// リアクティブデータ
const searchForm = ref({
  summonerName: 'shaat00',
  tagLine: 'JP1'
})

const loading = ref(false)
const loadingMatch = ref(false)
const summonerData = ref<SummonerSearchResult | null>(null)
const matchData = ref<MatchDetail | null>(null)
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
    
    // プレイヤー情報取得成功後、自動で最新試合情報も取得
    try {
      console.log('プレイヤー情報取得成功、最新試合情報を自動取得中...')
      await getLatestMatchInternal(response.account.puuid)
    } catch (matchError) {
      console.warn('最新試合情報の自動取得に失敗:', matchError)
      // 試合情報取得失敗は致命的エラーではないので、エラー表示はしない
      matchData.value = null
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