<!--
/**
 * PostMatch.vue - 完了試合詳細表示コンポーネント
 * 
 * 【使用場所】
 * - pages/index.vue（進行中試合がない場合のメイン表示）
 * 
 * 【機能・UI概要】
 * - 最新完了試合の詳細分析画面
 * - 分析対象プレイヤーの試合結果（勝敗、KDA、CS等）
 * - 使用チャンピオン、アイテムビルド、ルーン情報
 * - 両チーム全プレイヤーの成績表示
 * - チーム統計（TeamObjectiveStats）
 * - プレイヤーダメージ統計（PlayerDamageStats）
 * - 試合タイムライン（MatchTimeline）
 * - AI分析ボタンで試合後アドバイス生成
 * - タブ切り替えで各種統計情報を表示
 */
-->
<template>
  <div class="space-y-6">
    <!-- 分析対象プレイヤーとゲーム情報 -->
    <div class="card player-info">
      <div class="flex items-center justify-between gap-6">
        <!-- プレイヤー基本情報 -->
        <div
          class="flex-1 min-w-0 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-l-4 border-yellow-500"
        >
          <h2 class="text-yellow-400 font-bold truncate">
            {{ matchData.myParticipant.summonerName }}
          </h2>
          <p class="text-blue-300 font-semibold truncate">
            {{ getChampionName(matchData.myParticipant.championId) }} -
            {{ formatGameMode(matchData.gameInfo.queueId) }}
          </p>
        </div>

        <!-- 試合結果 -->
        <div class="flex-shrink-0 info-group">
          <span class="mr-2">試合結果:</span>
          <span
            class="font-bold"
            :class="matchData.myParticipant.win ? 'text-win' : 'text-loss'"
          >
            {{ matchData.myParticipant.win ? "勝利" : "敗北" }}
          </span>
        </div>

        <!-- KDA情報 -->
        <div class="flex-shrink-0 info-group">
          <span class="mr-2">KDA:</span>
          <span class="text-primary gaming-font mr-2">
            {{ matchData.myParticipant.kills }}/{{
              matchData.myParticipant.deaths
            }}/{{ matchData.myParticipant.assists }}
          </span>
          <span class="gaming-font">
            ({{ calculateKDA(matchData.myParticipant) }})
          </span>
        </div>

        <!-- アクションボタン -->
        <div class="flex-shrink-0 flex items-center gap-2">
          <button
            @click="$emit('downloadJson')"
            class="btn btn-secondary btn-sm flex items-center spacing-sm"
            title="AI入力パラメータをJSON形式でダウンロード（デバッグ用）"
          >
            <span>📥</span>
            AI入力データ
          </button>
          <AIAnalysisButton
            :is-generating="!!isGeneratingAdvice"
            :has-analysis="!!hasAdvice"
            button-type="secondary"
            analysis-type="post-match"
            @generate-analysis="$emit('generatePostMatchAdvice')"
          />
        </div>
      </div>
    </div>

    <!-- AI試合後分析結果 -->
    <PostMatchAnalysis 
      v-if="postMatchAdvice"
      :advice="postMatchAdvice" 
    />

    <!-- チーム成績・オブジェクト情報 -->
    <TeamObjectiveStats
      v-if="matchData.teamStats"
      :team-stats="matchData.teamStats"
      :get-champion-name="getChampionName"
    />

    <!-- 試合タイムライン -->
    <div class="card">
      <MatchTimeline
        v-if="matchData.matchId"
        :key="matchData.matchId"
        :match-id="matchData.matchId"
        :match-data="matchData"
      />
    </div>

    <!-- プレイヤー詳細統計 -->
    <div class="card">
      <div class="mb-6">
        <h3 class="heading-md flex items-center lol-accent">
          <span class="mr-2">📈</span>
          プレイヤー詳細統計
        </h3>
        <p class="text-secondary text-sm mt-1">
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
              :class="
                matchData.myParticipant.win
                  ? 'team-result-badge win'
                  : 'team-result-badge loss'
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
                  ? 'bg-blue-900 border border-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
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
                  <div class="highlight-tertiary text-primary mb-1">
                    {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
                  </div>
                  <div class="stat-highlight text-xs">
                    KDA: {{ calculateKDA(player) }}
                  </div>
                  <div
                    class="text-xs mt-1"
                    :class="player.rank ? 'text-blue-600' : 'text-muted'"
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
              :class="
                !matchData.myParticipant.win
                  ? 'team-result-badge win'
                  : 'team-result-badge loss'
              "
            >
              {{ !matchData.myParticipant.win ? "勝利" : "敗北" }}
            </div>
          </div>
          <div class="space-y-3">
            <div
              v-for="player in matchData.enemyTeam"
              :key="player.puuid"
              class="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
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
                  <div class="highlight-tertiary text-primary mb-1">
                    {{ player.kills }}/{{ player.deaths }}/{{ player.assists }}
                  </div>
                  <div class="stat-highlight text-xs">
                    KDA: {{ calculateKDA(player) }}
                  </div>
                  <div
                    class="text-xs mt-1"
                    :class="player.rank ? 'text-red-600' : 'text-muted'"
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
import TeamObjectiveStats from "~/components/pre-match/TeamObjectiveStats.vue";
import PlayerDamageStats from "~/components/post-match/PlayerDamageStats.vue";
import MatchTimeline from "~/components/post-match/MatchTimeline.vue";
import PostMatchAnalysis from "~/components/post-match/PostMatchAnalysis.vue";
import AIAnalysisButton from "~/components/common/AIAnalysisButton.vue";
import "@/assets/styles/components/PostMatch.css";

// Props
interface Props {
  matchData: MatchDetail;
  isGeneratingAdvice?: boolean;
  hasAdvice?: boolean;
  postMatchAdvice?: any | null;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  downloadJson: [];
  generatePostMatchAdvice: [];
}>();

// チャンピオンデータ初期化（SSR対応）
const championIdMap = createChampionIdMap(championData);
const getChampionName = createGetChampionName(championIdMap);

// KDA計算関数
const calculateKDA = (player: any): string => {
  if (player.deaths === 0) {
    return "Perfect";
  }
  const kda = (player.kills + player.assists) / player.deaths;
  return kda.toFixed(2);
};
</script>
