<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 帯状ヘッダ（トップの余白0） -->
    <header class="sticky top-0 z-50 w-full bg-white/90 backdrop-blur border-b">
      <div class="mx-auto main-content-width px-6">
        <div class="h-16 flex items-center justify-between gap-6">
          <div class="min-w-0">
            <h1 class="text-lg font-bold text-gray-900 leading-none">LoL Insight</h1>
            <p class="hidden sm:block text-xs text-gray-600 truncate">最新試合のマッチアップを分析</p>
          </div>

          <!-- 検索フォーム（ヘッダ内・コンパクト） -->
          <form @submit.prevent="searchSummoner" class="flex items-center gap-3 w-full sm:w-auto max-w-4xl">
            <input
              v-model="searchForm.summonerName"
              type="text"
              required
              class="flex-1 min-w-52 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="ゲーム名"
            />
            <input
              v-model="searchForm.tagLine"
              type="text"
              required
              class="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="JP1"
            />
            <button
              type="submit"
              :disabled="loading"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed h-10 px-4 text-sm flex items-center justify-center whitespace-nowrap"
            >
              <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ loading ? '分析中...' : 'マッチ分析' }}
            </button>
            <button
              type="button"
              :disabled="loading || isAdviceGenerating"
              @click="onFetchFeaturedUser"
              class="h-10 px-4 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="/lol/spectator/v5/featured-games から実行中ユーザーを取得して入力欄にセット"
            >実行中ユーザー取得</button>
          </form>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <div class="w-full mx-auto px-4 py-10">
      <div class="main-content-width mx-auto">

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
              <div>
                <h2 class="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <span>進行中の試合</span>
                  <span class="text-green-600 text-sm font-normal">LIVE</span>
                </h2>
                <p class="text-gray-600">
                  {{ formatGameMode(liveMatchData.gameInfo.queueId) }} - {{ formatGameTime(liveMatchData.gameInfo.gameLength) }}経過
                </p>
              </div>
              
              <div class="flex items-center gap-3">
                <button
                  class="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isAdviceGenerating"
                  @click="onRegenerateAdvice"
                >
                  {{ isAdviceGenerating ? 'アドバイス生成中…' : 'アドバイス再生成' }}
                </button>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">
                    進行中
                  </div>
                  <div class="text-sm text-gray-500">ゲーム状況</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ライブマッチアップ詳細 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 味方チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-semibold text-blue-600">
                    味方チーム
                  </h3>
                  <div v-if="liveMatchData.teamAverages" class="text-sm text-gray-600">
                    平均ティア: <span class="font-semibold text-blue-600">{{ formatTierScore(liveMatchData.teamAverages.myTeam.tierScore) }}</span>
                  </div>
                </div>
                <div class="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  あなたのチーム
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in liveMatchData.myTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 rounded-lg transition-colors"
                     :class="[
                       player.puuid === liveMatchData.myParticipant.puuid ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100',
                       player.isHighestWinRate ? 'ring-1 ring-green-300' : '',
                       player.isLowestWinRate ? 'ring-1 ring-red-300' : ''
                     ]">
                  <div>
                    <div class="font-medium text-gray-900">{{ getChampionName(player.championId) }}</div>
                    <div class="text-sm text-gray-600">{{ getSummonerSpellName(player.spell1Id) }}/{{ getSummonerSpellName(player.spell2Id) }}</div>
                    <div v-if="player.rank && (player.isHighestWinRate || player.isLowestWinRate)" class="mt-1 space-x-2">
                      <span v-if="player.isHighestWinRate" class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">最高勝率</span>
                      <span v-if="player.isLowestWinRate" class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">最低勝率</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs" :class="player.rank ? 'text-blue-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `レベル${player.summonerLevel || 0}` }}
                    </div>
                    <div v-if="player.rank" class="text-xs text-gray-500" :title="`${player.rank.queueType}の戦績`">
                      Win {{ player.rank.wins }} Lose {{ player.rank.losses }} ({{ player.rank.winRate }}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 敵チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-semibold text-red-600">
                    敵チーム
                  </h3>
                  <div v-if="liveMatchData.teamAverages" class="text-sm text-gray-600">
                    平均ティア: <span class="font-semibold text-red-600">{{ formatTierScore(liveMatchData.teamAverages.enemyTeam.tierScore) }}</span>
                  </div>
                </div>
                <div class="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-800">
                  相手チーム
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="player in liveMatchData.enemyTeam" :key="player.puuid" 
                     class="flex items-center justify-between p-3 rounded-lg transition-colors"
                     :class="[
                       'bg-gray-50 hover:bg-gray-100',
                       player.isHighestWinRate ? 'ring-1 ring-green-300' : '',
                       player.isLowestWinRate ? 'ring-1 ring-red-300' : ''
                     ]">
                  <div>
                    <div class="font-medium text-gray-900">{{ getChampionName(player.championId) }}</div>
                    <div class="text-sm text-gray-600">{{ getSummonerSpellName(player.spell1Id) }}/{{ getSummonerSpellName(player.spell2Id) }}</div>
                    <div v-if="player.rank && (player.isHighestWinRate || player.isLowestWinRate)" class="mt-1 space-x-2">
                      <span v-if="player.isHighestWinRate" class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">最高勝率</span>
                      <span v-if="player.isLowestWinRate" class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">最低勝率</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs" :class="player.rank ? 'text-red-600' : 'text-gray-500'">
                      {{ player.rank ? `${player.rank.tier} ${player.rank.rank}` : `レベル${player.summonerLevel || 0}` }}
                    </div>
                    <div v-if="player.rank" class="text-xs text-gray-500" :title="`${player.rank.queueType}の戦績`">
                      Win {{ player.rank.wins }} Lose {{ player.rank.losses }} ({{ player.rank.winRate }}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AIアドバイス（新スキーマ対応） -->
          <div class="card">
            <div class="mb-6">
              <h3 class="text-xl font-semibold">AI アドバイス</h3>
              <p class="text-gray-600 text-sm mt-1">自分のチャンピオンと敵チーム5人に対する詳細分析</p>
            </div>
            
            <div v-if="isAdviceGenerating" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <div class="text-gray-500">AIがマッチアップを詳細分析中…</div>
            </div>
            
            <div v-else-if="aiAdvice" class="space-y-8">
              <!-- マッチアップ分析 -->
              <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span class="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
                  マッチアップ分析
                </h4>
                <div v-if="aiAdvice['マッチアップ分析']?.length" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div v-for="(matchup, i) in aiAdvice['マッチアップ分析']" :key="'matchup'+i" 
                       class="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <h5 class="font-bold text-lg text-gray-900">{{ matchup.対戦相手 }}</h5>
                        <div class="text-xs text-blue-600">{{ matchup.自分のチャンピオン }} vs {{ matchup.対戦相手 }}</div>
                      </div>
                      <span class="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">{{ matchup.相手ロール }}</span>
                    </div>
                    
                    <div class="space-y-3">
                      <div>
                        <div class="text-sm font-medium text-green-700 mb-1">💪 相手の強み</div>
                        <ul class="list-disc pl-4 text-sm text-gray-700 space-y-1">
                          <li v-for="(strength, j) in matchup.強み" :key="'str'+i+j">{{ strength }}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <div class="text-sm font-medium text-red-700 mb-1">🎯 相手の弱み</div>
                        <ul class="list-disc pl-4 text-sm text-gray-700 space-y-1">
                          <li v-for="(weakness, j) in matchup.弱み" :key="'weak'+i+j">{{ weakness }}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <div class="text-sm font-medium text-blue-700 mb-1">⚔️ 戦略</div>
                        <ul class="list-disc pl-4 text-sm text-gray-700 space-y-1">
                          <li v-for="(strategy, j) in matchup.戦略" :key="'strat'+i+j">{{ strategy }}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <div class="text-sm font-medium text-orange-700 mb-1">⚠️ 注意点</div>
                        <ul class="list-disc pl-4 text-sm text-gray-700 space-y-1">
                          <li v-for="(caution, j) in matchup.注意点" :key="'caut'+i+j">{{ caution }}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-gray-500 text-center py-4">マッチアップ分析データがありません</div>
              </div>

              <!-- 推奨装備 -->
              <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span class="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
                  推奨装備
                </h4>
                <div v-if="aiAdvice['推奨装備']" class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <div class="text-sm font-medium text-purple-700 mb-2">🏁 序盤装備</div>
                      <ul class="space-y-1">
                        <li v-for="(item, i) in (aiAdvice['推奨装備']['序盤装備'] || [])" :key="'early'+i" 
                            class="text-sm bg-white px-2 py-1 rounded shadow-sm">{{ item }}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <div class="text-sm font-medium text-purple-700 mb-2">⭐ コアアイテム</div>
                      <ul class="space-y-1">
                        <li v-for="(item, i) in (aiAdvice['推奨装備']['コアアイテム'] || [])" :key="'core'+i"
                            class="text-sm bg-white px-2 py-1 rounded shadow-sm font-medium">{{ item }}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <div class="text-sm font-medium text-purple-700 mb-2">🔄 状況対応装備</div>
                      <div class="space-y-2">
                        <div v-for="(situational, i) in (aiAdvice['推奨装備']['状況対応装備'] || [])" :key="'sit'+i"
                             class="text-xs bg-white p-2 rounded shadow-sm">
                          <div class="text-gray-600">{{ situational.条件 }}</div>
                          <div class="font-medium">→ {{ situational.アイテム }}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div class="text-sm font-medium text-purple-700 mb-2">📊 装備優先度</div>
                      <ol class="space-y-1">
                        <li v-for="(item, i) in (aiAdvice['推奨装備']['装備優先度'] || [])" :key="'priority'+i"
                            class="text-sm bg-white px-2 py-1 rounded shadow-sm">
                          <span class="text-purple-600 font-bold">{{ i+1 }}.</span> {{ item }}
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 相手チーム分析 -->
              <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span class="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
                  相手チーム分析
                </h4>
                <div v-if="aiAdvice['相手チーム分析']" class="space-y-6">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- チーム全体の強み -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                      <h5 class="font-semibold text-green-800 mb-3 flex items-center">
                        <span class="mr-2">💪</span>相手チームの強み
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="(strength, i) in (aiAdvice['相手チーム分析']['チーム全体の強み'] || [])" :key="'team_str'+i"
                            class="text-sm text-gray-700 bg-white p-2 rounded shadow-sm">{{ strength }}</li>
                      </ul>
                    </div>
                    
                    <!-- チーム全体の弱み -->
                    <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4">
                      <h5 class="font-semibold text-red-800 mb-3 flex items-center">
                        <span class="mr-2">🎯</span>相手チームの弱み
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="(weakness, i) in (aiAdvice['相手チーム分析']['チーム全体の弱み'] || [])" :key="'team_weak'+i"
                            class="text-sm text-gray-700 bg-white p-2 rounded shadow-sm">{{ weakness }}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <!-- 狙い目ターゲット -->
                  <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4">
                    <h5 class="font-semibold text-blue-800 mb-3 flex items-center">
                      <span class="mr-2">🎯</span>狙い目ターゲット
                    </h5>
                    <div class="space-y-3">
                      <div v-for="(target, i) in (aiAdvice['相手チーム分析']['狙い目ターゲット'] || [])" :key="'target'+i"
                           class="bg-white p-3 rounded shadow-sm">
                        <div class="font-medium text-blue-800 mb-1">{{ target.チャンピオン }}</div>
                        <div class="text-sm text-gray-600 mb-2">{{ target.理由 }}</div>
                        <div class="text-sm text-blue-700 font-medium">攻略法: {{ target.攻略法 }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="text-center py-8 text-gray-500">
              <div class="text-lg mb-2">📋</div>
              まだアドバイスはありません
            </div>
          </div>
        </div>

        <!-- 過去試合分析結果 -->
        <div v-if="matchData" class="space-y-6">
          <!-- 分析対象プレイヤーとゲーム情報 -->
          <div class="card">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  {{ matchData.myParticipant.summonerName }}
                </h2>
                <p class="text-gray-600">
                  {{ getChampionName(matchData.myParticipant.championId) }} - {{ formatGameMode(matchData.gameInfo.queueId) }}
                </p>
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
                    <div class="text-sm text-gray-600">{{ getChampionName(player.championId) }}</div>
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
                    <div class="text-sm text-gray-600">{{ getChampionName(player.championId) }}</div>
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
const aiAdvice = ref<any | null>(null)
const isAdviceGenerating = ref(false)
let adviceController: AbortController | null = null

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

// テスト用：Featured Games から実行中ユーザーを取得し、入力欄へセット（実行はユーザー側）
const onFetchFeaturedUser = async () => {
  try {
    error.value = ''
    const res = await $fetch<{ puuid: string; summonerName?: string | null; gameName?: string | null; tagLine?: string | null; sampleGameId?: number | null }>(
      '/api/test/live',
      { method: 'GET' }
    )
    const gn = (res.gameName || res.summonerName || '').toString()
    const tl = (res.tagLine || '').toString() || 'JP1'
    if (!gn) {
      error.value = '実行中ユーザーのサモナー名を取得できませんでした'
      return
    }
    // 入力欄にセット（実行はユーザーの操作）
    searchForm.value.summonerName = gn
    searchForm.value.tagLine = tl
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || String(err)
    error.value = `[FEATURED] ${msg}`
  }
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
  // 不正値や負の秒数を0に丸めてMM:SS表示
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// チャンピオンデータ読み込み（SSR対応）
import championData from '@/data/champion.json'

// チャンピオンIDマップを初期化時に作成（SSR安全）
const championIdMap: { [key: number]: string } = {}
if (championData?.data && typeof championData.data === 'object') {
  Object.values(championData.data).forEach((champion: any) => {
    if (champion?.key && champion?.name) {
      championIdMap[parseInt(champion.key)] = champion.name
    }
  })
}

// チャンピオン名取得関数
const getChampionName = (championId: number) => {
  return championIdMap[championId] || `Champion ${championId}`
}

// チャンピオン名取得（ID→Name）をAI入力用に利用
const getChampionNameById = (id: number) => getChampionName(id)

// AI アドバイス生成（自動/再生成共通）
const generateAdvice = async () => {
  if (!liveMatchData.value) return
  if (adviceController) adviceController.abort()
  adviceController = new AbortController()
  isAdviceGenerating.value = true
  error.value = ''
  aiAdvice.value = null
  try {
    const body = {
      gameId: String(liveMatchData.value.gameId),
      gameInfo: {
        gameMode: liveMatchData.value.gameInfo.gameMode,
        queueId: liveMatchData.value.gameInfo.queueId
      },
      myTeam: liveMatchData.value.myTeam.map((p: any) => ({
        championName: getChampionNameById(p.championId),
        rank: p.rank,
        summonerLevel: p.summonerLevel,
        role: undefined,
        teamId: p.teamId,
      })),
      enemyTeam: liveMatchData.value.enemyTeam.map((p: any) => ({
        championName: getChampionNameById(p.championId),
        rank: p.rank,
        summonerLevel: p.summonerLevel,
        role: undefined,
        teamId: p.teamId,
      })),
    }
    const res: any = await $fetch('/api/advice/generate', { method: 'POST', body, signal: adviceController.signal })
    aiAdvice.value = res
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500
    const msg = err?.data?.message || err?.statusMessage || err?.message || String(err)
    error.value = `[AI ${statusCode}] ${msg}`
  } finally {
    isAdviceGenerating.value = false
  }
}

// 自動生成: liveMatchData が更新されたら走らせる（SSR安全）
watch(() => liveMatchData.value?.gameId, async (id) => {
  if (id && typeof window !== 'undefined') await generateAdvice()
}, { immediate: false })

// 再生成ボタン
const onRegenerateAdvice = () => {
  if (!isAdviceGenerating.value) generateAdvice()
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

// ティアスコアをランク名+数値形式でフォーマット
const formatTierScore = (tierScore: number) => {
  const tierNames = ['', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger']
  const baseTier = Math.floor(tierScore)
  const tierName = tierNames[baseTier] || 'Unranked'
  
  if (baseTier >= 8) {
    // Master以上はランクなし、数値のみ
    return `${tierName}${tierScore.toFixed(1)}`
  } else if (baseTier >= 1) {
    // 通常ティアは名前+数値
    return `${tierName}${tierScore.toFixed(1)}`
  } else {
    return 'Unranked'
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
