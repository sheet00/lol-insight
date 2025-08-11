<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-16">
      <!-- ヘッダー -->
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-gray-900 mb-4">
          LoL Insight
        </h1>
        <p class="text-xl text-gray-600">
          League of Legends プレイヤー情報分析ツール
        </p>
      </header>

      <!-- サモナー検索フォーム -->
      <div class="max-w-2xl mx-auto">
        <div class="card mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-6 text-center">
            プレイヤー検索（Riot ID）
          </h2>
          
          <form @submit.prevent="searchSummoner" class="space-y-6">
            <!-- ゲーム名入力 -->
            <div>
              <label for="summonerName" class="block text-sm font-medium text-gray-700 mb-2">
                ゲーム名（Riot ID）
              </label>
              <input
                id="summonerName"
                v-model="searchForm.summonerName"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：shaat00"
              />
            </div>

            <!-- タグライン入力 -->
            <div>
              <label for="tagLine" class="block text-sm font-medium text-gray-700 mb-2">
                タグライン
              </label>
              <input
                id="tagLine"
                v-model="searchForm.tagLine"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：JP1"
              />
            </div>

            <!-- 検索ボタン -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span v-if="loading" class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              {{ loading ? '検索中...' : 'プレイヤー情報を取得' }}
            </button>
          </form>
        </div>

        <!-- 検索結果表示エリア -->
        <div v-if="summonerData" class="card">
          <h3 class="text-xl font-semibold text-gray-800 mb-6">
            プレイヤー情報
          </h3>
          
          <!-- プレイヤー基本情報 -->
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🎮
              </div>
              <div>
                <h4 class="text-2xl font-bold text-gray-900">
                  {{ summonerData.account.gameName }}#{{ summonerData.account.tagLine }}
                </h4>
                <p v-if="summonerData.challenges" class="text-gray-600">
                  総合ランク: {{ summonerData.challenges.totalPoints.level }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- 詳細情報 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- アカウント情報 -->
            <div class="bg-white border border-gray-200 p-4 rounded-lg">
              <h5 class="font-semibold text-gray-800 mb-3">アカウント情報</h5>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">ゲーム名:</span>
                  <span class="font-medium">{{ summonerData.account.gameName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">タグライン:</span>
                  <span class="font-medium">{{ summonerData.account.tagLine }}</span>
                </div>
                <div v-if="summonerData.challenges" class="flex justify-between">
                  <span class="text-gray-600">総合実力:</span>
                  <span class="font-medium">{{ summonerData.challenges.totalPoints.level }}</span>
                </div>
              </div>
            </div>
            
            <!-- ランク情報 -->
            <div class="bg-white border border-gray-200 p-4 rounded-lg">
              <h5 class="font-semibold text-gray-800 mb-3">ランク情報</h5>
              <div v-if="summonerData.leagues.length > 0" class="space-y-2">
                <div v-for="league in summonerData.leagues" :key="league.queueType" class="text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">{{ league.queueType }}:</span>
                    <span class="font-medium">{{ league.tier }} {{ league.rank }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-gray-500 text-sm">
                ランク情報が見つかりませんでした
              </div>
            </div>
          </div>
          
          <!-- デバッグ情報（開発時のみ） -->
          <details class="mt-6">
            <summary class="cursor-pointer text-gray-600 text-sm hover:text-gray-800">
              詳細なデータを表示（デバッグ用）
            </summary>
            <div class="bg-gray-50 p-4 rounded-lg mt-2">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ JSON.stringify(summonerData, null, 2) }}</pre>
            </div>
          </details>
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
import type { SummonerSearchResult } from '~/types'

// リアクティブデータ
const searchForm = ref({
  summonerName: 'shaat00',
  tagLine: 'JP1'
})

const loading = ref(false)
const summonerData = ref<SummonerSearchResult | null>(null)
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