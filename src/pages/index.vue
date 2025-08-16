<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 帯状ヘッダ（トップの余白0） -->
    <header class="sticky top-0 z-50 w-full bg-white/90 backdrop-blur border-b">
      <div class="mx-auto main-content-width px-6">
        <div class="h-16 flex items-center justify-between gap-6">
          <div class="min-w-0">
            <h1 class="text-lg font-bold text-gray-900 leading-none">
              LoL Insight
            </h1>
            <p class="hidden sm:block text-xs text-gray-600 truncate">
              最新試合のマッチアップを分析
            </p>
          </div>

          <!-- 検索フォーム・AIモデル選択（ヘッダ内・コンパクト） -->
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto max-w-5xl"
          >
            <!-- AIモデル選択 -->
            <ModelSelector
              v-model="selectedAiModel"
              class="compact"
              @change="onModelChange"
            />

            <!-- 検索フォーム -->
            <form
              @submit.prevent="searchSummoner"
              class="flex items-center gap-3 w-full sm:w-auto"
            >
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
                <span
                  v-if="loading"
                  class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                ></span>
                {{ loading ? "分析中..." : "マッチ分析" }}
              </button>
              <button
                type="button"
                :disabled="loading || isAdviceGenerating || userFetchLoading"
                @click="onFetchFeaturedUser"
                class="h-10 px-4 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                title="/lol/spectator/v5/featured-games から試合中ユーザーを取得して入力欄にセット"
              >
                <span
                  v-if="userFetchLoading"
                  class="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"
                ></span>
                {{ userFetchLoading ? "検索中..." : "試合中ユーザー取得" }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <div class="w-full mx-auto px-4 py-10">
      <div class="main-content-width mx-auto">
        <!-- 分析対象プレイヤー表示 -->
        <div
          v-if="summonerData && !matchData && !liveMatchData"
          class="card text-center"
        >
          <div class="py-8">
            <div class="text-2xl font-bold text-gray-900 mb-2">
              {{ summonerData.account.gameName }}#{{
                summonerData.account.tagLine
              }}
            </div>
            <div class="text-gray-600 mb-4">
              プレイヤーの試合情報を分析中...
            </div>
            <div
              class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            ></div>
          </div>
        </div>

        <!-- 進行中試合分析結果 -->
        <div v-if="liveMatchData" class="space-y-6">
          <!-- 進行中試合ヘッダー -->
          <div class="card">
            <div
              class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
            >
              <div>
                <h2
                  class="text-xl font-bold text-gray-900 flex items-center space-x-2"
                >
                  <span>進行中の試合</span>
                  <span class="text-green-600 text-sm font-normal">LIVE</span>
                </h2>
                <p class="text-gray-600">
                  {{ formatGameMode(liveMatchData.gameInfo.queueId) }} -
                  {{ formatGameTime(liveMatchData.gameInfo.gameLength) }}経過
                </p>
              </div>

              <div class="flex items-center gap-3">
                <button
                  class="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isAdviceGenerating"
                  @click="onRegenerateAdvice"
                >
                  {{
                    isAdviceGenerating
                      ? "アドバイス生成中…"
                      : "アドバイス再生成"
                  }}
                </button>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">進行中</div>
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
                  <div
                    v-if="liveMatchData.teamAverages"
                    class="text-sm text-gray-600"
                  >
                    平均ティア:
                    <span class="font-semibold text-blue-600">{{
                      formatTierScore(
                        liveMatchData.teamAverages.myTeam.tierScore
                      )
                    }}</span>
                  </div>
                </div>
                <div
                  class="text-sm font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-800"
                >
                  あなたのチーム
                </div>
              </div>
              <div class="space-y-3">
                <div
                  v-for="player in liveMatchData.myTeam"
                  :key="player.puuid"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  :class="[
                    player.puuid === liveMatchData.myParticipant.puuid
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100',
                    player.isHighestWinRate ? 'ring-2 ring-green-300' : '',
                    player.isLowestWinRate ? 'ring-2 ring-red-300' : '',
                  ]"
                >
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ getChampionName(player.championId) }}
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ getSummonerSpellName(player.spell1Id) }}/{{
                        getSummonerSpellName(player.spell2Id)
                      }}
                    </div>
                    <div
                      v-if="
                        player.rank &&
                        (player.isHighestWinRate || player.isLowestWinRate)
                      "
                      class="mt-1 space-x-2"
                    >
                      <span
                        v-if="player.isHighestWinRate"
                        class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium"
                        >最高勝率</span
                      >
                      <span
                        v-if="player.isLowestWinRate"
                        class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium"
                        >最低勝率</span
                      >
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      class="text-xs"
                      :class="player.rank ? 'text-blue-600' : 'text-gray-500'"
                    >
                      {{
                        player.rank
                          ? `${player.rank.tier} ${player.rank.rank}`
                          : `レベル${player.summonerLevel || 0}`
                      }}
                    </div>
                    <div
                      v-if="player.rank"
                      class="text-xs text-gray-500"
                      :title="`${player.rank.queueType}の戦績`"
                    >
                      Win {{ player.rank.wins }} Lose
                      {{ player.rank.losses }} ({{ player.rank.winRate }}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 敵チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-semibold text-red-600">敵チーム</h3>
                  <div
                    v-if="liveMatchData.teamAverages"
                    class="text-sm text-gray-600"
                  >
                    平均ティア:
                    <span class="font-semibold text-red-600">{{
                      formatTierScore(
                        liveMatchData.teamAverages.enemyTeam.tierScore
                      )
                    }}</span>
                  </div>
                </div>
                <div
                  class="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-800"
                >
                  相手チーム
                </div>
              </div>
              <div class="space-y-3">
                <div
                  v-for="player in liveMatchData.enemyTeam"
                  :key="player.puuid"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  :class="[
                    'bg-gray-50 hover:bg-gray-100',
                    player.isHighestWinRate ? 'ring-2 ring-green-300' : '',
                    player.isLowestWinRate ? 'ring-2 ring-red-300' : '',
                  ]"
                >
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ getChampionName(player.championId) }}
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ getSummonerSpellName(player.spell1Id) }}/{{
                        getSummonerSpellName(player.spell2Id)
                      }}
                    </div>
                    <div
                      v-if="
                        player.rank &&
                        (player.isHighestWinRate || player.isLowestWinRate)
                      "
                      class="mt-1 space-x-2"
                    >
                      <span
                        v-if="player.isHighestWinRate"
                        class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium"
                        >最高勝率</span
                      >
                      <span
                        v-if="player.isLowestWinRate"
                        class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium"
                        >最低勝率</span
                      >
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      class="text-xs"
                      :class="player.rank ? 'text-red-600' : 'text-gray-500'"
                    >
                      {{
                        player.rank
                          ? `${player.rank.tier} ${player.rank.rank}`
                          : `レベル${player.summonerLevel || 0}`
                      }}
                    </div>
                    <div
                      v-if="player.rank"
                      class="text-xs text-gray-500"
                      :title="`${player.rank.queueType}の戦績`"
                    >
                      Win {{ player.rank.wins }} Lose
                      {{ player.rank.losses }} ({{ player.rank.winRate }}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AIアドバイス（シンプル版） -->
          <div class="card">
            <div class="mb-6">
              <h3
                class="text-xl font-semibold flex items-center justify-between"
              >
                <span>AI アドバイス</span>
                <span
                  v-if="aiDurationMs !== null"
                  class="text-sm text-gray-500 font-normal"
                >
                  生成時間: {{ formatNumber(aiDurationMs) }}ms
                </span>
              </h3>
              <p class="text-gray-600 text-sm mt-1">
                試合開始直前に確認すべき重要なポイント
              </p>
            </div>

            <div v-if="isAdviceGenerating" class="text-center py-8">
              <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"
              ></div>
              <div class="text-gray-500">AIがマッチアップを分析中…</div>
            </div>

            <div v-else-if="aiAdvice" class="space-y-6">
              <!-- 対面チャンピオン分析 -->
              <div v-if="aiAdvice['対面チャンピオン分析']" class="space-y-4">
                <!-- 警戒ポイント -->
                <div>
                  <h4
                    class="text-lg font-semibold text-red-800 mb-3 flex items-center"
                  >
                    <span
                      class="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                      >⚠️</span
                    >
                    対面の警戒ポイント
                  </h4>
                  <div
                    class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4"
                  >
                    <div
                      v-if="aiAdvice['対面チャンピオン分析']['警戒ポイント']"
                      class="prose prose-sm max-w-none"
                    >
                      <div
                        class="text-gray-800 leading-relaxed"
                        v-html="
                          formatTextWithBreaks(
                            aiAdvice['対面チャンピオン分析']['警戒ポイント']
                          )
                        "
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- 対策方法 -->
                <div>
                  <h4
                    class="text-lg font-semibold text-red-700 mb-3 flex items-center"
                  >
                    <span
                      class="bg-red-100 text-red-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                      >🎯</span
                    >
                    対面への対策
                  </h4>
                  <div
                    class="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4"
                  >
                    <div
                      v-if="aiAdvice['対面チャンピオン分析']['対策方法']"
                      class="prose prose-sm max-w-none"
                    >
                      <div
                        class="text-gray-800 leading-relaxed"
                        v-html="
                          formatTextWithBreaks(
                            aiAdvice['対面チャンピオン分析']['対策方法']
                          )
                        "
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 自分の戦略 -->
              <div v-if="aiAdvice['自分の戦略']" class="space-y-4">
                <!-- レーン戦 -->
                <div>
                  <h4
                    class="text-lg font-semibold text-blue-800 mb-3 flex items-center"
                  >
                    <span
                      class="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                      >⚔️</span
                    >
                    レーン戦の立ち回り
                  </h4>
                  <div
                    class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4"
                  >
                    <div
                      v-if="aiAdvice['自分の戦略']['レーン戦']"
                      class="prose prose-sm max-w-none"
                    >
                      <div
                        class="text-gray-800 leading-relaxed"
                        v-html="
                          formatTextWithBreaks(
                            aiAdvice['自分の戦略']['レーン戦']
                          )
                        "
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- 集団戦 -->
                <div>
                  <h4
                    class="text-lg font-semibold text-green-800 mb-3 flex items-center"
                  >
                    <span
                      class="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                      >👥</span
                    >
                    集団戦での役割
                  </h4>
                  <div
                    class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4"
                  >
                    <div
                      v-if="aiAdvice['自分の戦略']['集団戦']"
                      class="prose prose-sm max-w-none"
                    >
                      <div
                        class="text-gray-800 leading-relaxed"
                        v-html="
                          formatTextWithBreaks(aiAdvice['自分の戦略']['集団戦'])
                        "
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- 装備戦略 -->
                <div>
                  <h4
                    class="text-lg font-semibold text-purple-800 mb-3 flex items-center"
                  >
                    <span
                      class="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                      >🛡️</span
                    >
                    おすすめ装備
                  </h4>
                  <div
                    class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4"
                  >
                    <div
                      v-if="aiAdvice['自分の戦略']['装備戦略']"
                      class="prose prose-sm max-w-none"
                    >
                      <div
                        class="text-gray-800 leading-relaxed"
                        v-html="
                          formatTextWithBreaks(
                            aiAdvice['自分の戦略']['装備戦略']
                          )
                        "
                      ></div>
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
            <div
              class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
            >
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  {{ matchData.myParticipant.summonerName }}
                </h2>
                <p class="text-gray-600">
                  {{ getChampionName(matchData.myParticipant.championId) }} -
                  {{ formatGameMode(matchData.gameInfo.queueId) }}
                </p>
              </div>

              <div class="flex items-center space-x-6">
                <div class="text-center">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      matchData.myParticipant.win
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    {{ matchData.myParticipant.win ? "勝利" : "敗北" }}
                  </div>
                  <div class="text-sm text-gray-500">結果</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-800">
                    {{ matchData.myParticipant.kills }}/{{
                      matchData.myParticipant.deaths
                    }}/{{ matchData.myParticipant.assists }}
                  </div>
                  <div class="text-sm text-gray-500">KDA</div>
                </div>
              </div>
            </div>
          </div>

          <!-- チーム成績・オブジェクト情報 -->
          <TeamObjectiveStats 
            v-if="matchData.teamStats"
            :team-stats="matchData.teamStats"
            :get-champion-name="getChampionName"
          />

          <!-- マッチアップ詳細 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 味方チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3
                  class="text-lg font-semibold"
                  :class="
                    matchData.myParticipant.win
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  "
                >
                  味方チーム
                </h3>
                <div
                  class="text-sm font-medium px-3 py-1 rounded-full"
                  :class="
                    matchData.myParticipant.win
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  "
                >
                  {{ matchData.myParticipant.win ? "勝利" : "敗北" }}
                </div>
              </div>
              <div class="space-y-3">
                <div
                  v-for="player in matchData.myTeam"
                  :key="player.puuid"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  :class="
                    player.puuid === matchData.myParticipant.puuid
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  "
                >
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ player.summonerName }}
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ getChampionName(player.championId) }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ player.kills }}/{{ player.deaths }}/{{
                        player.assists
                      }}
                    </div>
                    <div
                      class="text-xs"
                      :class="player.rank ? 'text-blue-600' : 'text-gray-500'"
                    >
                      {{
                        player.rank
                          ? `${player.rank.tier} ${player.rank.rank}`
                          : `Lv.${player.summonerLevel}`
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 敵チーム -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3
                  class="text-lg font-semibold"
                  :class="
                    !matchData.myParticipant.win
                      ? 'text-red-600'
                      : 'text-gray-600'
                  "
                >
                  敵チーム
                </h3>
                <div
                  class="text-sm font-medium px-3 py-1 rounded-full"
                  :class="
                    !matchData.myParticipant.win
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  "
                >
                  {{ !matchData.myParticipant.win ? "勝利" : "敗北" }}
                </div>
              </div>
              <div class="space-y-3">
                <div
                  v-for="player in matchData.enemyTeam"
                  :key="player.puuid"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ player.summonerName }}
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ getChampionName(player.championId) }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">
                      {{ player.kills }}/{{ player.deaths }}/{{
                        player.assists
                      }}
                    </div>
                    <div
                      class="text-xs"
                      :class="player.rank ? 'text-red-600' : 'text-gray-500'"
                    >
                      {{
                        player.rank
                          ? `${player.rank.tier} ${player.rank.rank}`
                          : `レベル${player.summonerLevel || 0}`
                      }}
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
              <h3 class="text-lg font-semibold text-red-800">
                エラーが発生しました
              </h3>
              <p class="text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  SummonerSearchResult,
  MatchDetail,
  LiveMatchDetail,
} from "~/types";
import TeamObjectiveStats from "~/components/TeamObjectiveStats.vue";
import { formatTextWithBreaks } from "@/utils/textFormatter";
import {
  formatGameMode,
  formatGameTime,
  formatNumber,
  formatTierScore,
} from "@/utils/gameFormatters";
import {
  createChampionIdMap,
  createGetChampionName,
  getSummonerSpellName,
} from "@/utils/championUtils";
import championData from "@/data/champion.json";
import { useMatchApi } from "@/composables/useMatchApi";

// チャンピオンデータ初期化（SSR対応）
const championIdMap = createChampionIdMap(championData);
const getChampionName = createGetChampionName(championIdMap);
const getChampionNameById = (id: number) => getChampionName(id);

// Composable
const {
  searchSummoner: apiSearchSummoner,
  getLiveMatchInternal,
  getLatestMatchInternal,
  fetchFeaturedUser,
  generateAdvice,
} = useMatchApi();

// リアクティブデータ
const searchForm = ref({
  summonerName: "shaat00",
  tagLine: "JP1",
});

const loading = ref(false);
const userFetchLoading = ref(false);
const summonerData = ref<SummonerSearchResult | null>(null);
const matchData = ref<MatchDetail | null>(null);
const liveMatchData = ref<LiveMatchDetail | null>(null);
const error = ref("");
const aiAdvice = ref<any | null>(null);
const isAdviceGenerating = ref(false);
let adviceController: AbortController | null = null;
// 生成AI処理時間（ミリ秒）
const aiDurationMs = ref<number | null>(null);

// AIモデル選択
const selectedAiModel = ref("");

// モデル変更時の処理
const onModelChange = (model: string) => {
  // 既存のアドバイスがある場合は再生成を促す
  if (liveMatchData.value && aiAdvice.value) {
    // 自動再生成は行わず、ユーザーが再生成ボタンを押すまで待機
    console.log("モデル変更により、アドバイス再生成が可能です");
  }
};

// サモナー検索処理
const searchSummoner = async () => {
  if (
    !searchForm.value.summonerName.trim() ||
    !searchForm.value.tagLine.trim()
  ) {
    error.value = "サモナー名とタグラインを入力してください";
    return;
  }

  loading.value = true;
  error.value = "";

  // 前の結果をすべてクリア
  summonerData.value = null;
  matchData.value = null;
  liveMatchData.value = null;
  aiAdvice.value = null;
  aiDurationMs.value = null;

  // 進行中のアドバイス生成があればキャンセル
  if (adviceController) {
    adviceController.abort();
    adviceController = null;
  }
  isAdviceGenerating.value = false;

  try {
    // APIを使用してサモナー検索
    const response = await apiSearchSummoner(
      searchForm.value.summonerName,
      searchForm.value.tagLine
    );

    summonerData.value = response;

    // プレイヤー情報取得成功後、まず進行中試合をチェック
    try {
      console.log("プレイヤー情報取得成功、進行中試合をチェック中...");
      const liveData = await getLiveMatchInternal(response.account.puuid);
      liveMatchData.value = liveData;
      matchData.value = null;
    } catch (liveError) {
      console.log("進行中試合なし、過去試合を取得中...");
      // 進行中試合がない場合、過去の試合を取得
      try {
        const latestMatchData = await getLatestMatchInternal(
          response.account.puuid
        );
        matchData.value = latestMatchData;
        liveMatchData.value = null;
      } catch (matchError) {
        console.warn("過去試合情報の取得にも失敗:", matchError);
        matchData.value = null;
        liveMatchData.value = null;
      }
    }
  } catch (err: any) {
    console.error("サモナー検索エラー:", err);

    // エラー内容を詳しく表示
    let errorMessage = "サモナー情報の取得に失敗しました";

    if (err.message) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    }

    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

// テスト用：Featured Games から実行中ユーザーを取得し、入力欄へセット（実行はユーザー側）
const onFetchFeaturedUser = async () => {
  try {
    userFetchLoading.value = true;
    error.value = "";
    const response = await fetchFeaturedUser();
    // 入力欄にセット（実行はユーザーの操作）
    searchForm.value.summonerName = response.summonerName;
    searchForm.value.tagLine = response.tagLine;
  } catch (err: any) {
    const msg = err?.message || String(err);
    error.value = `[FEATURED] ${msg}`;
  } finally {
    userFetchLoading.value = false;
  }
};

// AI アドバイス生成（自動/再生成共通）
const generateAdviceHandler = async () => {
  if (!liveMatchData.value) return;
  if (adviceController) adviceController.abort();
  adviceController = new AbortController();
  isAdviceGenerating.value = true;
  error.value = "";
  aiAdvice.value = null;

  try {
    const now =
      typeof performance !== "undefined" && (performance as any)?.now
        ? () => performance.now()
        : () => Date.now();
    const start = now();

    const res = await generateAdvice(
      liveMatchData.value,
      selectedAiModel.value,
      adviceController
    );

    const end = now();
    aiDurationMs.value = Math.max(0, Math.round(end - start));
    aiAdvice.value = res;
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const msg =
      err?.data?.message || err?.statusMessage || err?.message || String(err);
    error.value = `[AI ${statusCode}] ${msg}`;
  } finally {
    isAdviceGenerating.value = false;
  }
};

// 自動生成: liveMatchData が更新されたら走らせる（SSR安全）
watch(
  () => liveMatchData.value?.gameId,
  async (id) => {
    if (id && typeof window !== "undefined") await generateAdviceHandler();
  },
  { immediate: false }
);

// 再生成ボタン
const onRegenerateAdvice = () => {
  if (!isAdviceGenerating.value) generateAdviceHandler();
};

// メタ情報
useHead({
  title: "LoL Insight - サモナー検索",
  meta: [
    {
      name: "description",
      content: "League of Legends プレイヤー情報を検索・分析するツール",
    },
  ],
});
</script>
