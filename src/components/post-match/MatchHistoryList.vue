<!--
/**
 * MatchHistoryList.vue - 試合履歴リスト表示コンポーネント
 * 
 * 【使用場所】
 * - pages/index.vue（試合履歴セクション）
 * 
 * 【機能・UI概要】
 * - プレイヤーの過去試合履歴一覧表示
 * - 試合数カウンター（XX件の試合）
 * - 各試合の基本情報（勝敗、チャンピオン、KDA、日時）
 * - MatchHistoryItem を使用した個別試合項目表示
 * - 履歴が空の場合のメッセージ表示
 * - クリック可能な試合項目（詳細表示トリガー）
 * - レスポンシブ対応リストレイアウト
 */
-->
<template>
  <div class="card space-y-6">
    <!-- ヘッダー -->
    <div class="match-history-header">
      <h2 class="match-history-title">過去の試合履歴</h2>
      <div class="match-history-count" v-if="matchHistory.length > 0">
        {{ matchHistory.length }}件の試合
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="historyError" class="match-history-error">
      {{ historyError }}
    </div>

    <!-- ローディング表示 -->
    <div
      v-else-if="isHistoryLoading && matchHistory.length === 0"
      class="text-center py-8"
    >
      <div class="flex items-center justify-center gap-3 mb-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 flex-shrink-0"></div>
        <div class="loading-text">試合履歴を読み込み中...</div>
      </div>
    </div>

    <!-- 試合履歴が空の場合 -->
    <div v-else-if="matchHistory.length === 0" class="match-history-empty">
      試合履歴がありません
    </div>

    <!-- 試合履歴リスト -->
    <div v-else>
      <div class="match-history-list">
        <MatchHistoryItemComponent
          v-for="match in matchHistory"
          :key="match.matchId"
          :match="match"
          :is-selected="isMatchSelected(match.matchId)"
          :is-loading="
            isMatchDetailLoading && selectedMatchId === match.matchId
          "
          @detail-click="onDetailClick"
        />
      </div>

      <!-- ページネーション -->
      <div class="match-history-pagination">
        <div class="match-history-page-info">
          <span v-if="isHistoryLoading">読み込み中...</span>
          <span v-else>{{ matchHistory.length }}件の試合を表示中</span>
        </div>

        <button
          class="match-history-nav-button"
          :disabled="!hasMoreMatches || isHistoryLoading"
          @click="onNextPage"
        >
          <span v-if="isHistoryLoading">読み込み中...</span>
          <span v-else>さらに古い試合を読み込む</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatchHistoryItem } from "~/types";
import MatchHistoryItemComponent from "./MatchHistoryItem.vue";
import { useMatchHistory } from "~/composables/useMatchHistory";
import "@/assets/styles/components/MatchHistoryList.css";

// Props
interface Props {
  puuid: string;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: "match-selected", matchId: string, matchData: any): void;
}

const emit = defineEmits<Emits>();

// Composable
const {
  matchHistory,
  currentPage,
  isHistoryLoading,
  selectedMatchId,
  selectedMatchData,
  isMatchDetailLoading,
  hasMoreMatches,
  historyError,
  loadMatchHistory,
  loadNextPage,
  loadMatchDetail,
  isMatchSelected,
} = useMatchHistory();

// 初期化
onMounted(async () => {
  if (props.puuid) {
    await loadMatchHistory(props.puuid);
  }
});

// puuidが変更された時の処理
watch(
  () => props.puuid,
  async (newPuuid, oldPuuid) => {
    if (newPuuid && newPuuid !== oldPuuid) {
      await loadMatchHistory(newPuuid);
    }
  }
);

// 選択した試合データが変更された時の処理
watch(selectedMatchData, (newData) => {
  if (newData && selectedMatchId.value) {
    emit("match-selected", selectedMatchId.value, newData);
  }
});

// 詳細ボタンクリック処理
const onDetailClick = async (matchId: string) => {
  try {
    await loadMatchDetail(props.puuid, matchId);
  } catch (error: any) {
    console.error("試合詳細取得エラー:", error);
  }
};

// 古い試合ボタンクリック処理
const onNextPage = async () => {
  if (hasMoreMatches.value && !isHistoryLoading.value) {
    await loadNextPage(props.puuid);
  }
};

// 外部からの再読み込み用メソッドを公開
const reloadHistory = () => {
  if (props.puuid) {
    loadMatchHistory(props.puuid);
  }
};

defineExpose({
  reloadHistory,
});
</script>
