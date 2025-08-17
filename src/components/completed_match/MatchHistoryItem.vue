<!--
/**
 * MatchHistoryItem.vue - 個別試合履歴項目コンポーネント
 * 
 * 【使用場所】
 * - components/completed_match/MatchHistoryList.vue（各試合項目として）
 * 
 * 【機能・UI概要】
 * - 単一試合の概要情報カード表示
 * - 試合日時と勝敗ステータス（勝利/敗北の色分け）
 * - 使用チャンピオン画像とレベル
 * - KDA（キル/デス/アシスト）統計
 * - CS（クリープスコア）と獲得ゴールド
 * - アイテムビルド（6個のアイテムアイコン）
 * - クリック選択対応（選択状態の視覚的フィードバック）
 * - ホバーエフェクトでインタラクティブ操作
 */
-->
<template>
  <div 
    class="card card-md card-interactive"
    :class="{ selected: isSelected }"
  >
    <!-- ヘッダー: 日時と勝敗 -->
    <div class="match-history-item-header">
      <div class="match-history-item-date">
        {{ formatMatchDate(match.gameCreation) }}
      </div>
      <div 
        class="match-history-item-result font-bold"
        :class="match.result === 'WIN' ? 'text-win' : 'text-loss'"
      >
        {{ match.result === 'WIN' ? '勝利' : '敗北' }}
      </div>
    </div>

    <!-- コンテンツ: 試合情報 -->
    <div class="match-history-item-content">
      <div class="match-history-item-left">
        <div class="match-history-item-game-info">
          {{ match.gameMode }}
        </div>
        <div class="match-history-item-details spacing-sm">
          <span class="highlight-tertiary">{{ match.myChampion }}</span>
          <span class="stat-highlight">{{ match.kda }}</span>
          <span class="text-muted text-sm">{{ formatGameDuration(match.gameDuration) }}</span>
        </div>
      </div>

      <div class="match-history-item-right">
        <button
          class="btn btn-primary btn-sm"
          :disabled="isLoading"
          @click="onDetailClick"
        >
          <div v-if="isLoading" class="match-history-item-loading">
            <div class="match-history-item-loading-spinner"></div>
            <span>読込中</span>
          </div>
          <span v-else>詳細表示</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatchHistoryItem } from "~/types";
import "@/assets/styles/components/MatchHistoryItem.css";

// Props
interface Props {
  match: MatchHistoryItem;
  isSelected?: boolean;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isLoading: false,
});

// Emits
interface Emits {
  (e: 'detail-click', matchId: string): void;
}

const emit = defineEmits<Emits>();

// 詳細表示ボタンクリック
const onDetailClick = () => {
  if (!props.isLoading) {
    emit('detail-click', props.match.matchId);
  }
};

// 日時フォーマット関数
const formatMatchDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 試合時間フォーマット関数
const formatGameDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
};
</script>