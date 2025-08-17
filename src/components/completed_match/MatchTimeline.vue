<!--
/**
 * MatchTimeline.vue - 試合タイムライン表示コンポーネント
 * 
 * 【使用場所】
 * - components/completed_match/CompletedMatch.vue（タイムラインタブ内）
 * 
 * 【機能・UI概要】
 * - 試合中の重要なイベント時系列表示
 * - 折りたたみ・展開機能（クリックで切り替え）
 * - キル、デス、オブジェクト制圧等の主要イベント
 * - 各イベントの発生時刻とプレイヤー情報
 * - チーム別背景色でイベントを視覚的に区別
 * - スクロール可能な縦並びタイムライン
 * - 重要度に応じたイベントアイコン表示
 * - 空データ時の適切なメッセージ表示
 */
-->
<template>
  <h3
    class="text-xl font-semibold text-white cursor-pointer"
    @click="toggleTimeline"
  >
    <span class="mr-2">⏰</span>試合タイムライン
    <span class="ml-2 text-sm text-gray-300">
      (クリックで{{ isExpanded ? "折りたたみ" : "展開" }})
    </span>
  </h3>

  <div
    class="timeline-content transition-all duration-300 ease-in-out"
    :class="isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'"
  >
    <div class="timeline-header mt-4">
      <div class="timeline-controls">
        <button
          @click="toggleFilter('all')"
          :class="{ active: activeFilter === 'all' }"
          class="filter-btn"
        >
          全て
        </button>
        <button
          @click="toggleFilter('KILL')"
          :class="{ active: activeFilter === 'KILL' }"
          class="filter-btn kill"
        >
          💀 キル
        </button>
        <button
          @click="toggleFilter('MONSTER')"
          :class="{ active: activeFilter === 'MONSTER' }"
          class="filter-btn monster"
        >
          🐉 オブジェクト
        </button>
        <button
          @click="toggleFilter('BUILDING')"
          :class="{ active: activeFilter === 'BUILDING' }"
          class="filter-btn building"
        >
          🏗️ 建物
        </button>
        <button
          @click="toggleFilter('ITEM')"
          :class="{ active: activeFilter === 'ITEM' }"
          class="filter-btn item"
        >
          🛒 アイテム
        </button>
      </div>
    </div>

    <div class="timeline-contents">
      <div class="timeline-container" v-if="filteredEvents.length > 0">
        <div
          v-for="event in filteredEvents"
          :key="`${event.timestamp}-${event.type}`"
          class="timeline-event"
          :class="[
            `event-${event.type.toLowerCase()}`,
            `priority-${event.priority}`,
            `team-${getEventTeam(event)}`,
          ]"
        >
          <div class="event-time">
            {{ event.timeString }}
          </div>
          <div class="event-icon">
            {{ event.icon }}
          </div>
          <div class="event-content">
            <div class="event-description">
              {{ event.description }}
            </div>
            <div
              class="event-details"
              v-if="
                event.type === 'KILL' &&
                event.assistingParticipantIds &&
                event.assistingParticipantIds.length > 0
              "
            >
              <span class="assists">
                アシスト: {{ event.assistingParticipantIds?.length }}人
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="timeline-loading">
        <div class="loading-spinner"></div>
        <p>タイムライン読み込み中...</p>
      </div>

      <div v-else class="timeline-empty">
        <p>📊 タイムラインデータがありません</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/components/MatchTimeline.css";

interface TimelineEvent {
  type: string;
  timestamp: number;
  timeString: string;
  frameIndex: number;
  description: string;
  icon: string;
  priority: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  position?: any;
  buildingType?: string;
  teamId?: number;
  monsterType?: string;
  itemId?: number;
  participantId?: number;
  level?: number;
  laneType?: string;
  isMyself?: boolean;
  itemName?: string;
  purchaserName?: string;
  purchaserTeam?: string;
  killerTeam?: string;
  victimTeam?: string;
  attackerTeam?: string;
  teamSide?: string;
}

interface Props {
  matchId: string;
  matchData?: any; // 試合の全データ（参加者情報含む）
}

const props = defineProps<Props>();

// リアクティブ状態
const events = ref<TimelineEvent[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const activeFilter = ref<string>("all");
const isExpanded = ref(false);

// 計算プロパティ
const filteredEvents = computed(() => {
  if (activeFilter.value === "all") {
    return events.value;
  }
  return events.value.filter((event) => event.type === activeFilter.value);
});

// メソッド
const toggleFilter = (filter: string) => {
  activeFilter.value = filter;
};

const toggleTimeline = () => {
  isExpanded.value = !isExpanded.value;
};

// イベントのチーム判定
const getEventTeam = (event: TimelineEvent) => {
  // チーム情報を持つプロパティをチェック
  if (event.killerTeam) return event.killerTeam;
  if (event.attackerTeam) return event.attackerTeam;
  if (event.teamSide) return event.teamSide;
  if (event.purchaserTeam) return event.purchaserTeam;

  // フォールバック
  return "neutral";
};

const fetchTimeline = async () => {
  if (!props.matchId) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch("/api/match/timeline", {
      method: "POST",
      body: {
        matchId: props.matchId,
        matchData: props.matchData,
      },
    });

    if (response.success) {
      events.value = response.data.events;
    } else {
      throw new Error("タイムラインの取得に失敗しました");
    }
  } catch (err: any) {
    console.error("タイムライン取得エラー:", err);
    error.value = err.message || "タイムラインの取得に失敗しました";
  } finally {
    loading.value = false;
  }
};

// ウォッチャー
watch(
  () => props.matchId,
  (newMatchId) => {
    if (newMatchId) {
      fetchTimeline();
    }
  },
  { immediate: true }
);

// ライフサイクル
onMounted(() => {
  if (props.matchId) {
    fetchTimeline();
  }
});
</script>
