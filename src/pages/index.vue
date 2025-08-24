<template>
  <div class="min-h-screen" style="background-color: var(--lol-bg-primary)">
    <!-- メインコンテンツ -->
    <div class="w-full mx-auto px-4 py-10">
      <div class="main-content-width mx-auto">
        <!-- 分析対象プレイヤー表示 -->
        <div
          v-if="summonerData && !matchData && !liveMatchData && loading"
          class="card card-md text-center"
        >
          <div class="py-8">
            <div class="heading-lg mb-2">
              {{ summonerData.account.gameName }}#{{
                summonerData.account.tagLine
              }}
            </div>
            <div class="text-secondary mb-4">
              プレイヤーの試合情報を分析中...
            </div>
            <div
              class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            ></div>
          </div>
        </div>

        <!-- 進行中試合分析結果 -->
        <div v-if="liveMatchData" class="mb-8">
          <PreMatch
            :live-match-data="liveMatchData"
            :ai-advice="aiAdvice"
            :is-advice-generating="isAdviceGenerating"
            :ai-duration-ms="aiDurationMs"
            @regenerate-advice="onRegenerateAdvice"
          />
        </div>

        <!-- 過去試合分析結果 -->
        <div v-if="matchData" class="mb-8">
          <PostMatch
            :match-data="matchData"
            :is-generating-advice="isPostMatchAdviceGenerating"
            :has-advice="!!postMatchAdvice"
            :post-match-advice="postMatchAdvice"
            @download-json="downloadMatchAnalysisAsJson"
            @generate-post-match-advice="generatePostMatchAdvice"
          />
        </div>

        <!-- 試合履歴リスト（進行中試合がない場合に表示） -->
        <div v-if="summonerData && !liveMatchData && !loading" class="mb-8">
          <ClientOnly>
            <MatchHistoryList
              :puuid="summonerData.account.puuid"
              @match-selected="onMatchSelected"
            />
          </ClientOnly>
        </div>

        <!-- エラー表示 -->
        <div v-if="error" class="card card-md bg-red-900 border-red-700">
          <div class="flex items-center spacing-md">
            <div class="text-red-400">⚠️</div>
            <div>
              <h3 class="heading-sm text-red-300">エラーが発生しました</h3>
              <p class="text-red-200">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useSearchStore } from '@/stores/search';
import type {
  MatchDetail,
} from "~/types";
import PreMatch from "~/components/pre-match/PreMatch.vue";
import PostMatch from "~/components/post-match/PostMatch.vue";
import MatchHistoryList from "~/components/post-match/MatchHistoryList.vue";

// Searchストア
const searchStore = useSearchStore();
const {
  loading,
  summonerData,
  matchData,
  liveMatchData,
  error,
  aiAdvice,
  isAdviceGenerating,
  aiDurationMs,
  isPostMatchAdviceGenerating,
  postMatchAdvice,
  selectedAiModel,
} = storeToRefs(searchStore);
const { onRegenerateAdvice, onMatchSelected: storeOnMatchSelected } = searchStore;

// 試合後AI分析関連
let postMatchAdviceController: AbortController | null = null;

const generatePostMatchAdvice = async () => {
  if (!matchData.value) {
    error.value = "試合データがないため、AI分析を実行できません";
    return;
  }
  if (isPostMatchAdviceGenerating.value) return;

  isPostMatchAdviceGenerating.value = true;
  error.value = "";
  postMatchAdvice.value = null;
  postMatchAdviceController = new AbortController();

  try {
    const response = (await $fetch("/api/advice/post-match", {
      method: "POST",
      body: {
        matchId: matchData.value.matchId,
        matchData: {
          gameInfo: matchData.value.gameInfo,
          myTeam: matchData.value.myTeam,
          enemyTeam: matchData.value.enemyTeam,
          myParticipant: matchData.value.myParticipant,
          teamStats: matchData.value.teamStats,
          analysisSummary: matchData.value.analysisSummary,
          timelineEvents: matchData.value.timelineEvents || [],
        },
        model: selectedAiModel.value,
      },
      signal: postMatchAdviceController.signal,
    })) as any;

    if (response.success && response.analysis) {
      postMatchAdvice.value = response.analysis;
    } else {
      throw new Error(
        "AI分析に失敗しました: " + (response.message || "不明なエラー")
      );
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      error.value = "AI分析がキャンセルされました";
    } else {
      error.value = `AI分析エラー: ${err.message || err.data?.message}`;
    }
  } finally {
    isPostMatchAdviceGenerating.value = false;
    postMatchAdviceController = null;
  }
};

const downloadMatchAnalysisAsJson = () => {
  if (!matchData.value) return;

  const myItemPurchases =
    matchData.value.timelineEvents?.filter(
      (event: any) => event.type === "ITEM" && event.isMyself === true
    ) || [];

  const aiInputData = {
    matchId: matchData.value.matchId,
    myChampionName: matchData.value.myParticipant?.championName,
    gameResult: matchData.value.myParticipant?.win ? "WIN" : "LOSE",
    myItemPurchases: myItemPurchases.map((item: any) => ({
      timeString: item.timeString,
      timestamp: item.timestamp,
      itemName: item.itemName,
      itemId: item.itemId,
      description: item.description,
    })),
    gameInfo: matchData.value.gameInfo,
    myTeam: matchData.value.myTeam,
    enemyTeam: matchData.value.enemyTeam,
    myParticipant: matchData.value.myParticipant,
    teamStats: matchData.value.teamStats,
    analysisSummary: matchData.value.analysisSummary,
    timelineEvents: matchData.value.timelineEvents || [],
  };

  const jsonString = JSON.stringify(aiInputData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `LoL_AI_input_debug_${matchData.value.matchId}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const onMatchSelected = (matchId: string, selectedMatchData: MatchDetail) => {
  storeOnMatchSelected(selectedMatchData);
};

// メタ情報
useHead({
  title: "LoL Teacher - 試合分析",
  meta: [
    {
      name: "description",
      content: "League of Legends プレイヤー情報を検索・分析・学習するツール",
    },
  ],
});
</script>

<style scoped>
.main-content-width {
  max-width: 1280px;
}
</style>
