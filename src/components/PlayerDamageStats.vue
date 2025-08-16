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