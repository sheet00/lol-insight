<!--
/**
 * PreMatch.vue - 進行中試合詳細表示コンポーネント
 * 
 * 【使用場所】
 * - pages/index.vue（進行中試合がある場合のメイン表示）
 * 
 * 【機能・UI概要】
 * - リアルタイム試合情報の詳細表示画面
 * - 試合モード、マップ、進行時間の表示
 * - 両チーム（青・赤）のプレイヤー構成表示
 * - 各プレイヤーの選択チャンピオン、ルーン、サモナースペル
 * - プレイヤーランク情報（ティア、LP、勝率）
 * - AI分析ボタンで戦略アドバイス生成機能
 * - 対象プレイヤーのハイライト表示
 * - レスポンシブデザイン（モバイル/デスクトップ対応）
 */
-->
<template>
  <div class="space-y-6">
    <!-- 進行中試合ヘッダー -->
    <div class="card">
      <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
      >
        <div>
          <h2
            class="heading-lg flex items-center spacing-sm"
          >
            <span>進行中の試合</span>
            <span class="stat-highlight text-green-600 text-sm font-normal">LIVE</span>
          </h2>
          <p class="text-secondary">
            {{ formatGameMode(liveMatchData.gameInfo.queueId) }} -
            {{ formatGameTime(liveMatchData.gameInfo.gameLength) }}経過
          </p>
        </div>

        <div class="flex items-center gap-3">
          <AIAnalysisButton
            :is-generating="isAdviceGenerating"
            :has-analysis="!!aiAdvice"
            analysis-type="live"
            @generate-analysis="$emit('regenerateAdvice')"
          />
          <div class="text-center info-group">
            <div class="info-group-title">ゲーム状況</div>
            <div class="highlight-secondary text-green-600">進行中</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ライブマッチアップ詳細 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 自チーム -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-blue-600">自チーム</h3>
            <div
              v-if="liveMatchData.teamAverages"
              class="text-sm text-gray-400"
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
            class="text-sm font-medium px-3 py-1 rounded-full bg-blue-900 text-blue-300"
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
                ? 'bg-blue-900 border border-blue-700'
                : 'bg-gray-700 hover:bg-gray-600',
              player.isHighestWinRate ? 'ring-2 ring-green-300' : '',
              player.isLowestWinRate ? 'ring-2 ring-red-300' : '',
            ]"
          >
            <div>
              <div class="font-medium text-white">
                {{ getChampionName(player.championId) }}
              </div>
              <div class="text-sm text-gray-400">
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
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-medium"
                  >最高勝率</span
                >
                <span
                  v-if="player.isLowestWinRate"
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-300 font-medium"
                  >最低勝率</span
                >
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-xs"
                :class="player.rank ? 'text-blue-400' : 'text-gray-400'"
              >
                {{
                  player.rank
                    ? `${player.rank.tier} ${player.rank.rank}`
                    : `レベル${player.summonerLevel || 0}`
                }}
              </div>
              <div
                v-if="player.rank"
                class="text-xs text-gray-400"
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
              class="text-sm text-gray-400"
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
            class="text-sm font-medium px-3 py-1 rounded-full bg-red-900 text-red-300"
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
              'bg-gray-700 hover:bg-gray-600',
              player.isHighestWinRate ? 'ring-2 ring-green-300' : '',
              player.isLowestWinRate ? 'ring-2 ring-red-300' : '',
            ]"
          >
            <div>
              <div class="font-medium text-white">
                {{ getChampionName(player.championId) }}
              </div>
              <div class="text-sm text-gray-400">
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
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-medium"
                  >最高勝率</span
                >
                <span
                  v-if="player.isLowestWinRate"
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-300 font-medium"
                  >最低勝率</span
                >
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-xs"
                :class="player.rank ? 'text-red-400' : 'text-gray-400'"
              >
                {{
                  player.rank
                    ? `${player.rank.tier} ${player.rank.rank}`
                    : `レベル${player.summonerLevel || 0}`
                }}
              </div>
              <div
                v-if="player.rank"
                class="text-xs text-gray-400"
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
            class="text-sm text-gray-400 font-normal"
          >
            生成時間: {{ formatNumber(aiDurationMs) }}ms
          </span>
        </h3>
        <p class="text-gray-400 text-sm mt-1">
          試合開始直前に確認すべき重要なポイント
        </p>
      </div>

      <div v-if="isAdviceGenerating" class="loading-spinner text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
        <div class="loading-text text-gray-400">AIがマッチアップを分析中…</div>
      </div>

      <div v-else-if="aiAdvice" class="space-y-6">
        <!-- 対面チャンピオン分析 -->
        <div v-if="aiAdvice['対面チャンピオン分析']" class="space-y-4">
          <!-- 警戒ポイント -->
          <div>
            <h4
              class="text-lg font-semibold mb-3 flex items-center"
              style="color: var(--lol-text-primary);"
            >
              <span
                class="rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                style="background-color: var(--lol-bg-secondary); color: var(--lol-text-primary);"
                >⚠️</span
              >
              対面の警戒ポイント
            </h4>
            <div
              class="rounded-lg p-4"
              style="background-color: rgb(10, 20, 40);"
            >
              <div
                v-if="aiAdvice['対面チャンピオン分析']['警戒ポイント']"
                class="prose prose-sm max-w-none"
              >
                <div
                  class="leading-relaxed"
                  style="color: var(--lol-text-primary);"
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
              class="text-lg font-semibold mb-3 flex items-center"
              style="color: var(--lol-text-primary);"
            >
              <span
                class="rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                style="background-color: var(--lol-bg-secondary); color: var(--lol-text-primary);"
                >🎯</span
              >
              対面への対策
            </h4>
            <div
              class="rounded-lg p-4"
              style="background-color: rgb(10, 20, 40);"
            >
              <div
                v-if="aiAdvice['対面チャンピオン分析']['対策方法']"
                class="prose prose-sm max-w-none"
              >
                <div
                  class="leading-relaxed"
                  style="color: var(--lol-text-primary);"
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
              class="text-lg font-semibold mb-3 flex items-center"
              style="color: var(--lol-text-primary);"
            >
              <span
                class="rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                style="background-color: var(--lol-bg-secondary); color: var(--lol-text-primary);"
                >⚔️</span
              >
              レーン戦の立ち回り
            </h4>
            <div
              class="rounded-lg p-4"
              style="background-color: rgb(10, 20, 40);"
            >
              <div
                v-if="aiAdvice['自分の戦略']['レーン戦']"
                class="prose prose-sm max-w-none"
              >
                <div
                  class="text-gray-300 leading-relaxed"
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
                class="bg-green-900 text-green-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                >👥</span
              >
              集団戦での役割
            </h4>
            <div
              class="rounded-lg p-4"
              style="background-color: rgb(10, 20, 40);"
            >
              <div
                v-if="aiAdvice['自分の戦略']['集団戦']"
                class="prose prose-sm max-w-none"
              >
                <div
                  class="text-gray-300 leading-relaxed"
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
                class="bg-purple-900 text-purple-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2"
                >🛡️</span
              >
              おすすめ装備
            </h4>
            <div
              class="rounded-lg p-4"
              style="background-color: rgb(10, 20, 40);"
            >
              <div
                v-if="aiAdvice['自分の戦略']['装備戦略']"
                class="prose prose-sm max-w-none"
              >
                <div
                  class="text-gray-300 leading-relaxed"
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

      <div v-else class="text-center py-8 text-gray-400">
        <div class="text-lg mb-2">📋</div>
        まだアドバイスはありません
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiveMatchDetail } from "~/types";
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
import AIAnalysisButton from "~/components/common/AIAnalysisButton.vue";
import "@/assets/styles/components/PreMatch.css";

// Props
interface Props {
  liveMatchData: LiveMatchDetail;
  aiAdvice?: any;
  isAdviceGenerating: boolean;
  aiDurationMs?: number | null;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  regenerateAdvice: [];
}>();

// チャンピオンデータ初期化（SSR対応）
const championIdMap = createChampionIdMap(championData);
const getChampionName = createGetChampionName(championIdMap);
</script>