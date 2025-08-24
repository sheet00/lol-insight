import { ref, onMounted } from "vue";

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
      const response = await $fetch("/api/admin/cost/summary");
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

      const response = await $fetch("/api/admin/cost/list", { query });

      const data = (response as any).data || (response as any).value || response;
      if (data && data.logs) {
        logs.value = data.logs;
        pagination.value = data.pagination;
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