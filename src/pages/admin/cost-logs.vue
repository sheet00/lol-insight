<template>
  <div class="admin-cost-logs">
    <!-- ヘッダー -->
    <div class="header-section">
      <h1 class="page-title">コストログ管理</h1>
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-label">総費用</div>
          <div class="stat-value">
            ¥{{ stats.total?.cost_jpy?.toFixed(2) || "0.00" }} / ${{
              stats.total?.cost_usd?.toFixed(4) || "0.0000"
            }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">総リクエスト</div>
          <div class="stat-value">{{ stats.total?.requests || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">総トークン</div>
          <div class="stat-value">
            {{ (stats.total?.tokens || 0).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>

    <!-- ログ一覧 -->
    <div class="logs-section">
      <div class="logs-header">
        <h2 class="logs-title">ログ一覧</h2>
        <button @click="loadLogs(true)" class="btn-refresh">更新</button>
      </div>
      <div v-if="loading" class="loading">ロード中...</div>
      <div v-else-if="!logs.length" class="empty-state">
        ログが見つかりません
      </div>
      <table v-else class="logs-table">
        <thead class="table-header">
          <tr>
            <th class="col-time">時刻</th>
            <th class="col-endpoint">エンドポイント</th>
            <th class="col-model">モデル</th>
            <th class="col-cost">費用(JPY)</th>
            <th class="col-cost">費用(USD)</th>
            <th class="col-tokens">トークン</th>
            <th class="col-status">状態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="table-row">
            <td class="col-time">{{ formatTime(log.createdAt) }}</td>
            <td class="col-endpoint">{{ log.endpoint }}</td>
            <td class="col-model">{{ log.model }}</td>
            <td class="col-cost">¥{{ log.totalCostJpy.toFixed(2) }}</td>
            <td class="col-cost">${{ log.totalCostUsd.toFixed(4) }}</td>
            <td class="col-tokens">{{ log.totalTokens.toLocaleString() }}</td>
            <td class="col-status">
              <span :class="log.success ? 'status-success' : 'status-error'">
                {{ log.success ? "成功" : "失敗" }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ページネーション -->
      <div v-if="pagination.total > 0" class="pagination">
        <button
          @click="prevPage"
          :disabled="pagination.offset === 0"
          class="btn-page"
        >
          前へ
        </button>

        <span class="page-info">
          {{ pagination.offset + 1 }} -
          {{ Math.min(pagination.offset + pagination.limit, pagination.total) }}
          / {{ pagination.total }}
        </span>

        <button
          @click="nextPage"
          :disabled="!pagination.hasMore"
          class="btn-page"
        >
          次へ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/components/CostLogsAdmin.css";
import { useCostLogs } from "@/composables/useCostLogs";

const {
  stats,
  logs,
  loading,
  pagination,
  loadLogs,
  prevPage,
  nextPage,
  formatTime,
} = useCostLogs();
</script>
