<template>
  <div class="space-y-6">
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

        <div class="flex items-center space-x-4">
          <button
            @click="$emit('outputToConsole')"
            class="btn-primary px-4 py-2 text-sm flex items-center gap-2"
            title="完了試合の分析結果をJSON形式でConsole.logに出力"
          >
            <span>📊</span>
            分析結果をConsoleに出力
          </button>
          <AIAnalysisButton
            :is-generating="!!isGeneratingAdvice"
            :has-analysis="!!hasAdvice"
            button-type="secondary"
            analysis-type="post-match"
            @generate-analysis="$emit('generatePostMatchAdvice')"
          />
          <div class="text-center">
            <div
              class="text-2xl font-bold"
              :class="
                matchData.myParticipant.win ? 'text-green-600' : 'text-red-600'
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

    <!-- 試合タイムライン（折りたたみ式） -->
    <div class="card">
      <div class="mb-4">
        <button
          @click="$emit('toggleTimeline')"
          class="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div class="flex items-center">
            <span class="mr-2">⏰</span>
            <h3 class="text-xl font-semibold text-gray-900">
              試合タイムライン
            </h3>
            <span class="ml-2 text-sm text-gray-500">
              (クリックで{{ showTimeline ? "折りたたみ" : "展開" }})
            </span>
          </div>
          <div
            class="transform transition-transform duration-200 text-gray-500"
            :class="{ 'rotate-180': showTimeline }"
          >
            ⬇️
          </div>
        </button>
      </div>

      <div
        class="timeline-content overflow-hidden overflow-y-auto max-h-96 transition-all duration-300 ease-in-out"
        :class="showTimeline ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'"
      >
        <MatchTimeline
          v-if="matchData.matchId && showTimeline"
          :match-id="matchData.matchId"
          :match-data="matchData"
        />
      </div>
    </div>

    <!-- プレイヤー詳細統計 -->
    <div class="card">
      <div class="mb-6">
        <h3 class="text-xl font-semibold text-gray-900 flex items-center">
          <span class="mr-2">📈</span>
          プレイヤー詳細統計
        </h3>
        <p class="text-gray-600 text-sm mt-1">
          各プレイヤーのKDA、ダメージ、CS、ゴールド詳細
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 自チーム -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4
              class="text-lg font-semibold"
              :class="
                matchData.myParticipant.win ? 'text-blue-600' : 'text-gray-600'
              "
            >
              自チーム
            </h4>
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
              class="p-3 rounded-lg transition-colors"
              :class="
                player.puuid === matchData.myParticipant.puuid
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              "
            >
              <!-- プレイヤー基本情報 -->
              <div class="flex items-center justify-between mb-2">
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
                    {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
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

              <!-- ダメージ統計 -->
              <PlayerDamageStats :player="player" />
            </div>
          </div>
        </div>

        <!-- 敵チーム -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4
              class="text-lg font-semibold"
              :class="
                !matchData.myParticipant.win ? 'text-red-600' : 'text-gray-600'
              "
            >
              敵チーム
            </h4>
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
              class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <!-- プレイヤー基本情報 -->
              <div class="flex items-center justify-between mb-2">
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
                    {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
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

              <!-- ダメージ統計 -->
              <PlayerDamageStats :player="player" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatchDetail } from "~/types";
import { formatGameMode } from "@/utils/gameFormatters";
import {
  createChampionIdMap,
  createGetChampionName,
} from "@/utils/championUtils";
import championData from "@/data/champion.json";
import TeamObjectiveStats from "~/components/TeamObjectiveStats.vue";
import PlayerDamageStats from "~/components/PlayerDamageStats.vue";
import MatchTimeline from "~/components/MatchTimeline.vue";
import AIAnalysisButton from "~/components/AIAnalysisButton.vue";
import "@/assets/styles/components/CompletedMatch.css";

// Props
interface Props {
  matchData: MatchDetail;
  showTimeline: boolean;
  isGeneratingAdvice?: boolean;
  hasAdvice?: boolean;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  outputToConsole: [];
  toggleTimeline: [];
  generatePostMatchAdvice: [];
}>();

// チャンピオンデータ初期化（SSR対応）
const championIdMap = createChampionIdMap(championData);
const getChampionName = createGetChampionName(championIdMap);
</script>
