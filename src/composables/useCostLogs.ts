import { ref, onMounted } from "vue";

interface CostLogsSummaryResponse {
  success: boolean;
  total: {
    cost_usd: number;
    cost_jpy: number;
    tokens: number;
    requests: number;
  };
  by_endpoint: Array<{
    endpoint: string;
    cost_usd: number;
    tokens: number;
    requests: number;
  }>;
  by_model: Array<{
    model: string;
    cost_usd: number;
    tokens: number;
    requests: number;
  }>;
}

interface CostLogsListResponse {
  success: boolean;
  logs: Array<{
    id: string;
    createdAt: string;
    endpoint: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    inputCostUsd: number;
    outputCostUsd: number;
    totalCostUsd: number;
    totalCostJpy: number;
    responseTimeMs: number;
    success: boolean;
    error: string | null;
    metadata: any;
    level: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useCostLogs() {
  // リアクティブデータ
  const stats = ref<any>({});
  const logs = ref<any[]>([]);
  const loading = ref(false);

  const pagination = ref({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // メソッド
  const loadStats = async () => {
    try {
      const response = await $fetch<CostLogsSummaryResponse>(
        "/api/admin/cost/summary"
      );
      stats.value = response;
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadLogs = async (resetOffset = false) => {
    if (resetOffset) {
      pagination.value.offset = 0;
    }

    loading.value = true;
    try {
      const query = {
        limit: pagination.value.limit,
        offset: pagination.value.offset,
      };

      const response = await $fetch<CostLogsListResponse>(
        "/api/admin/cost/list",
        { query }
      );

      if (response && response.logs && response.pagination) {
        logs.value = response.logs;
        pagination.value = response.pagination;
      } else {
        logs.value = [];
        console.error("Unexpected response structure:", response);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
      logs.value = [];
    } finally {
      loading.value = false;
    }
  };

  const prevPage = () => {
    if (pagination.value.offset > 0) {
      pagination.value.offset = Math.max(
        0,
        pagination.value.offset - pagination.value.limit
      );
      loadLogs();
    }
  };

  const nextPage = () => {
    if (pagination.value.hasMore) {
      pagination.value.offset += pagination.value.limit;
      loadLogs();
    }
  };

  const formatTime = (timestamp: string | number | Date) => {
    // SQLiteのDATETIME文字列 (YYYY-MM-DD HH:MM:SS) をJavaScriptのDateオブジェクトが解析できるように調整
    if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      // "YYYY-MM-DD HH:MM:SS" を "YYYY-MM-DDTHH:MM:SS.000Z" に変換してUTCとして扱う
      const isoString = timestamp.replace(' ', 'T') + '.000Z';
      return new Date(isoString).toLocaleString("ja-JP");
    }
    return new Date(timestamp).toLocaleString("ja-JP");
  };

  // 初期データ読み込み
  onMounted(() => {
    loadStats();
    loadLogs();
  });

  return {
    stats,
    logs,
    loading,
    pagination,
    loadLogs,
    prevPage,
    nextPage,
    formatTime,
  };
}
