<template>
  <div class="admin-cost-logs">
    <!-- ヘッダー -->
    <div class="header-section">
      <h1 class="page-title">コストログ管理</h1>
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-label">総費用</div>
          <div class="stat-value">${{ stats.total?.cost_usd?.toFixed(4) || '0.0000' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">総リクエスト</div>
          <div class="stat-value">{{ stats.total?.requests || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">総トークン</div>
          <div class="stat-value">{{ (stats.total?.tokens || 0).toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- アクションセクション -->
    <div class="filter-section" style="margin-bottom: 1rem;">
       <div class="action-row">
        <button @click="loadLogs(true)" class="btn-refresh">更新</button>
        <button @click="showCleanupModal = true" class="btn-danger">ログ削除</button>
      </div>
    </div>

    <!-- ログ一覧 -->
    <div class="logs-section">
      <div v-if="loading" class="loading">ロード中...</div>
      <div v-else-if="!logs.length" class="empty-state">
        ログが見つかりません
      </div>
      <div v-else class="logs-table">
        <div class="table-header">
          <div class="col-time">時刻</div>
          <div class="col-endpoint">エンドポイント</div>
          <div class="col-model">モデル</div>
          <div class="col-tokens">トークン</div>
          <div class="col-cost">費用</div>
          <div class="col-status">状態</div>
          <div class="col-actions">操作</div>
        </div>
        
        <div v-for="log in logs" :key="log.id" class="table-row">
          <div class="col-time">{{ formatTime(log.timestamp) }}</div>
          <div class="col-endpoint">{{ log.endpoint }}</div>
          <div class="col-model">{{ log.model }}</div>
          <div class="col-tokens">{{ log.totalTokens.toLocaleString() }}</div>
          <div class="col-cost">${{ log.totalCostUsd.toFixed(4) }}</div>
          <div class="col-status">
            <span :class="log.success ? 'status-success' : 'status-error'">
              {{ log.success ? '成功' : '失敗' }}
            </span>
          </div>
          <div class="col-actions">
            <button @click="showLogDetail(log)" class="btn-detail">詳細</button>
            <button @click="deleteLog(log.id)" class="btn-delete">削除</button>
          </div>
        </div>
      </div>

      <!-- ページネーション -->
      <div v-if="pagination.total > 0" class="pagination">
        <button 
          @click="prevPage" 
          :disabled="pagination.offset === 0"
          class="btn-page"
        >前へ</button>
        
        <span class="page-info">
          {{ pagination.offset + 1 }} - {{ Math.min(pagination.offset + pagination.limit, pagination.total) }} 
          / {{ pagination.total }}
        </span>
        
        <button 
          @click="nextPage" 
          :disabled="!pagination.hasMore"
          class="btn-page"
        >次へ</button>
      </div>
    </div>

    <!-- 詳細モーダル -->
    <div v-if="selectedLog" class="modal-overlay" @click="selectedLog = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>ログ詳細</h3>
          <button @click="selectedLog = null" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <label>ID:</label>
            <span>{{ selectedLog.id }}</span>
          </div>
          <div class="detail-row">
            <label>時刻:</label>
            <span>{{ formatTime(selectedLog.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <label>エンドポイント:</label>
            <span>{{ selectedLog.endpoint }}</span>
          </div>
          <div class="detail-row">
            <label>モデル:</label>
            <span>{{ selectedLog.model }}</span>
          </div>
          <div class="detail-row">
            <label>プロンプトトークン:</label>
            <span>{{ selectedLog.promptTokens.toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <label>完了トークン:</label>
            <span>{{ selectedLog.completionTokens.toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <label>費用 (USD):</label>
            <span>${{ selectedLog.totalCostUsd.toFixed(6) }}</span>
          </div>
          <div class="detail-row">
            <label>費用 (JPY):</label>
            <span>¥{{ selectedLog.totalCostJpy.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <label>レスポンス時間:</label>
            <span>{{ selectedLog.responseTimeMs }}ms</span>
          </div>
          <div class="detail-row">
            <label>状態:</label>
            <span :class="selectedLog.success ? 'status-success' : 'status-error'">
              {{ selectedLog.success ? '成功' : '失敗' }}
            </span>
          </div>
          <div v-if="selectedLog.error" class="detail-row">
            <label>エラー:</label>
            <pre class="error-text">{{ selectedLog.error }}</pre>
          </div>
          <div v-if="selectedLog.metadata" class="detail-row">
            <label>メタデータ:</label>
            <pre class="metadata-text">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 削除モーダル -->
    <div v-if="showCleanupModal" class="modal-overlay" @click="showCleanupModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>ログ一括削除</h3>
          <button @click="showCleanupModal = false" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="cleanup-option">
            <label>
              <input type="number" v-model="cleanupOptions.olderThan" min="1" placeholder="日数">
              日より古いログを削除
            </label>
          </div>
          <div class="cleanup-option">
            <label>
              <input v-model="cleanupOptions.endpoint" placeholder="エンドポイント">
              このエンドポイントのログを削除
            </label>
          </div>
          <div class="cleanup-option">
            <label>
              <input v-model="cleanupOptions.model" placeholder="モデル">
              このモデルのログを削除
            </label>
          </div>
          <div class="cleanup-actions">
            <button @click="executeCleanup" class="btn-danger">削除実行</button>
            <button @click="showCleanupModal = false" class="btn-cancel">キャンセル</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/styles/components/CostLogsAdmin.css"

// 認証チェックは一旦無効化（後で実装）
// definePageMeta({
//   middleware: 'auth'
// })



// リアクティブデータ
const stats = ref({})
const logs = ref([])
const selectedLog = ref(null)
const loading = ref(false)
const showCleanupModal = ref(false)

const pagination = ref({
  total: 0,
  limit: 50,
  offset: 0,
  hasMore: false
})

const cleanupOptions = ref({
  olderThan: null,
  endpoint: '',
  model: ''
})

// メソッド
const loadStats = async () => {
  try {
    const response = await $fetch('/api/admin/cost/summary')
    stats.value = response
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadLogs = async (resetOffset = false) => {
  if (resetOffset) {
    pagination.value.offset = 0
  }

  loading.value = true
  try {
    const query = {
      limit: pagination.value.limit,
      offset: pagination.value.offset,
    }

    const response = await $fetch('/api/admin/cost/list', { query })
    
    const data = response.data || response.value || response
    if (data && data.logs) {
      logs.value = data.logs
      pagination.value = data.pagination
    } else {
      logs.value = []
      console.error('Unexpected response structure:', response)
    }

  } catch (error) {
    console.error('Failed to load logs:', error)
    logs.value = []
  } finally {
    loading.value = false
  }
}

const showLogDetail = (log) => {
  selectedLog.value = log
}

const deleteLog = async (logId) => {
  if (!confirm('このログを削除しますか？')) return

  try {
    await $fetch(`/api/admin/cost/${logId}`, {
      method: 'DELETE'
    })
    loadLogs()
    loadStats()
  } catch (error) {
    console.error('Failed to delete log:', error)
    alert('ログの削除に失敗しました')
  }
}

const executeCleanup = async () => {
  const options = cleanupOptions.value
  
  if (!options.olderThan && !options.endpoint && !options.model) {
    alert('削除条件を指定してください')
    return
  }

  if (!confirm('選択した条件でログを一括削除しますか？この操作は取り消せません。')) {
    return
  }

  try {
    const response = await $fetch('/api/admin/cost/cleanup', {
      method: 'POST',
      body: options
    })
    
    alert(`${response.deleted}件のログを削除しました`)
    showCleanupModal.value = false
    
    // データをリロード
    loadLogs()
    loadStats()
    
    // フォームをリセット
    cleanupOptions.value = {
      olderThan: null,
      endpoint: '',
      model: ''
    }
  } catch (error) {
    console.error('Failed to cleanup logs:', error)
    alert('ログの削除に失敗しました')
  }
}

const prevPage = () => {
  if (pagination.value.offset > 0) {
    pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit)
    loadLogs()
  }
}

const nextPage = () => {
  if (pagination.value.hasMore) {
    pagination.value.offset += pagination.value.limit
    loadLogs()
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('ja-JP')
}

// 初期データ読み込み
onMounted(() => {
  loadStats()
  loadLogs()
})
</script>