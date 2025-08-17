<!--
/**
 * PlayerDamageStats.vue - プレイヤーダメージ統計表示コンポーネント
 * 
 * 【使用場所】
 * - components/completed_match/CompletedMatch.vue（ダメージ統計タブ内）
 * 
 * 【機能・UI概要】
 * - 対象プレイヤーの詳細ダメージ統計表示
 * - ゲーム統計（CS、ゴールド、レベル等）
 * - ダメージ統計（与ダメージ、被ダメージ、回復量等）
 * - 戦闘統計（キル関与率、視界スコア、CC時間等）
 * - 各統計値の数値とバー形式での視覚的表示
 * - カテゴリ別にセクション分けされた整理された表示
 * - プレイヤーパフォーマンスの詳細分析用データ
 */
-->
<template>
  <div class="player-stats-container">
    <!-- プレイヤー統計詳細表示 -->
    <div class="stats-details">
      <!-- ゲーム統計情報 -->
      <div class="stats-section">
        <h5 class="stats-section-title">ゲーム統計</h5>
        <div class="stats-items">
          <div class="stats-item cs">
            <span class="stats-label">CS</span>
            <span class="stats-value">{{ formatNumber(player.totalMinionsKilled || 0) }}</span>
          </div>
          <div class="stats-item gold">
            <span class="stats-label">ゴールド</span>
            <span class="stats-value">{{ formatNumber(player.goldEarned) }}</span>
          </div>
        </div>
      </div>

      <!-- 与ダメージ情報 -->
      <div class="stats-section">
        <h5 class="stats-section-title">与ダメージ</h5>
        <div class="stats-items">
          <div class="stats-item">
            <span class="stats-label">総計</span>
            <span class="stats-value">{{ formatNumber(player.totalDamageDealtToChampions) }}</span>
          </div>
          <div class="stats-item physical">
            <span class="stats-label">物理</span>
            <span class="stats-value">{{ formatNumber(player.physicalDamageDealtToChampions) }}</span>
          </div>
          <div class="stats-item magical">
            <span class="stats-label">魔法</span>
            <span class="stats-value">{{ formatNumber(player.magicDamageDealtToChampions) }}</span>
          </div>
          <div class="stats-item true-damage">
            <span class="stats-label">確定</span>
            <span class="stats-value">{{ formatNumber(player.trueDamageDealtToChampions) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 被ダメージ情報 -->
      <div class="stats-section">
        <h5 class="stats-section-title">被ダメージ</h5>
        <div class="stats-items">
          <div class="stats-item">
            <span class="stats-label">総計</span>
            <span class="stats-value">{{ formatNumber(player.totalDamageTaken) }}</span>
          </div>
          <div class="stats-item physical">
            <span class="stats-label">物理</span>
            <span class="stats-value">{{ formatNumber(player.physicalDamageTaken) }}</span>
          </div>
          <div class="stats-item magical">
            <span class="stats-label">魔法</span>
            <span class="stats-value">{{ formatNumber(player.magicDamageTaken) }}</span>
          </div>
          <div class="stats-item true-damage">
            <span class="stats-label">確定</span>
            <span class="stats-value">{{ formatNumber(player.trueDamageTaken) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ParticipantWithRank } from "~/types";
import { formatNumber } from "@/utils/gameFormatters";
import "@/assets/styles/components/PlayerDamageStats.css";

interface Props {
  player: ParticipantWithRank;
}

defineProps<Props>();
</script>