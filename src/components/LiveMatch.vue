<template>
  <div class="space-y-6">
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
          <AIAnalysisButton
            :is-generating="isAdviceGenerating"
            :has-analysis="!!aiAdvice"
            analysis-type="live"
            @generate-analysis="$emit('regenerateAdvice')"
          />
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">進行中</div>
            <div class="text-sm text-gray-500">ゲーム状況</div>
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
import AIAnalysisButton from "~/components/AIAnalysisButton.vue";
import "@/assets/styles/components/LiveMatch.css";

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