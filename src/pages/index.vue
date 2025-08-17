<template>
  <div class="min-h-screen" style="background-color: var(--lol-bg-primary);">
    <!-- ヘッダー -->
    <SearchHeader
      :search-form="searchForm"
      :selected-ai-model="selectedAiModel"
      :loading="loading"
      :is-advice-generating="isAdviceGenerating"
      :user-fetch-loading="userFetchLoading"
      @search="searchSummoner"
      @model-change="onModelChange"
      @update:summoner-name="searchForm.summonerName = $event"
      @update:tag-line="searchForm.tagLine = $event"
      @fetch-featured-user="onFetchFeaturedUser"
    />

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
        <PreMatch
          v-if="liveMatchData"
          :live-match-data="liveMatchData"
          :ai-advice="aiAdvice"
          :is-advice-generating="isAdviceGenerating"
          :ai-duration-ms="aiDurationMs"
          @regenerate-advice="onRegenerateAdvice"
        />

        <!-- 過去試合分析結果 -->
        <PostMatch
          v-if="matchData"
          :match-data="matchData"
          :is-generating-advice="isPostMatchAdviceGenerating"
          :has-advice="!!postMatchAdvice"
          @download-json="downloadMatchAnalysisAsJson"
          @generate-post-match-advice="generatePostMatchAdvice"
        />

        <!-- AI試合後分析結果 -->
        <PostMatchAnalysis v-if="postMatchAdvice" :advice="postMatchAdvice" />

        <!-- 試合履歴リスト（進行中試合がない場合に表示） -->
        <ClientOnly v-if="summonerData && !liveMatchData && !loading">
          <MatchHistoryList
            :puuid="summonerData.account.puuid"
            @match-selected="onMatchSelected"
          />
        </ClientOnly>

        <!-- エラー表示 -->
        <div v-if="error" class="card card-md bg-red-900 border-red-700">
          <div class="flex items-center spacing-md">
            <div class="text-red-400">⚠️</div>
            <div>
              <h3 class="heading-sm text-red-300">
                エラーが発生しました
              </h3>
              <p class="text-red-200">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  SummonerSearchResult,
  MatchDetail,
  LiveMatchDetail,
} from "~/types";
import SearchHeader from "~/components/common/SearchHeader.vue";
import PreMatch from "~/components/pre-match/PreMatch.vue";
import PostMatch from "~/components/post-match/PostMatch.vue";
import PostMatchAnalysis from "~/components/post-match/PostMatchAnalysis.vue";
import MatchHistoryList from "~/components/post-match/MatchHistoryList.vue";
import { formatGameMode, formatNumber } from "@/utils/gameFormatters";
import {
  createChampionIdMap,
  createGetChampionName,
} from "@/utils/championUtils";
import championData from "@/data/champion.json";
import { useMatchApi } from "@/composables/useMatchApi";

// チャンピオンデータ初期化（SSR対応）
const championIdMap = createChampionIdMap(championData);
const getChampionName = createGetChampionName(championIdMap);

// Composable
const {
  searchSummoner: apiSearchSummoner,
  getLiveMatchInternal,
  getLatestMatchInternal,
  fetchFeaturedUser,
  generateAdvice,
} = useMatchApi();

// リアクティブデータ
const searchForm = ref({
  summonerName: "shaat00",
  tagLine: "JP1",
});

const loading = ref(false);
const userFetchLoading = ref(false);
const summonerData = ref<SummonerSearchResult | null>(null);
const matchData = ref<MatchDetail | null>(null);
const liveMatchData = ref<LiveMatchDetail | null>(null);
const error = ref("");
const aiAdvice = ref<any | null>(null);
const isAdviceGenerating = ref(false);
let adviceController: AbortController | null = null;
// 生成AI処理時間（ミリ秒）
const aiDurationMs = ref<number | null>(null);

// 試合後AI分析関連
const isPostMatchAdviceGenerating = ref(false);
const postMatchAdvice = ref<any | null>(null);
let postMatchAdviceController: AbortController | null = null;

// AIモデル選択
const selectedAiModel = ref("");


// モデル変更時の処理
const onModelChange = (model: string) => {
  selectedAiModel.value = model;
  console.log("AIモデルが変更されました:", model);

  // 既存のアドバイスがある場合は再生成を促す
  if (liveMatchData.value && aiAdvice.value) {
    // 自動再生成は行わず、ユーザーが再生成ボタンを押すまで待機
    console.log("モデル変更により、アドバイス再生成が可能です");
  }
};

// サモナー検索処理
const searchSummoner = async () => {
  if (
    !searchForm.value.summonerName.trim() ||
    !searchForm.value.tagLine.trim()
  ) {
    error.value = "サモナー名とタグラインを入力してください";
    return;
  }

  loading.value = true;
  error.value = "";

  // 前の結果をすべてクリア
  summonerData.value = null;
  matchData.value = null;
  liveMatchData.value = null;
  aiAdvice.value = null;
  aiDurationMs.value = null;
  postMatchAdvice.value = null;

  // 進行中のアドバイス生成があればキャンセル
  if (adviceController) {
    adviceController.abort();
    adviceController = null;
  }
  isAdviceGenerating.value = false;

  try {
    // APIを使用してサモナー検索
    const response = await apiSearchSummoner(
      searchForm.value.summonerName,
      searchForm.value.tagLine
    );

    summonerData.value = response;

    // プレイヤー情報取得成功後、まず進行中試合をチェック
    try {
      console.log("プレイヤー情報取得成功、進行中試合をチェック中...");
      const liveData = await getLiveMatchInternal(response.account.puuid);
      liveMatchData.value = liveData;
      matchData.value = null;
    } catch (liveError) {
      console.log("進行中試合なし、試合履歴リストを表示します");
      // 進行中試合がない場合は試合履歴リストを表示する
      liveMatchData.value = null;
      matchData.value = null;
    }
  } catch (err: any) {
    console.error("サモナー検索エラー:", err);

    // エラー内容を詳しく表示
    let errorMessage = "サモナー情報の取得に失敗しました";

    if (err.message) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    }

    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

// テスト用：Featured Games から実行中ユーザーを取得し、入力欄へセット（実行はユーザー側）
const onFetchFeaturedUser = async () => {
  try {
    userFetchLoading.value = true;
    error.value = "";
    const response = await fetchFeaturedUser();
    // 入力欄にセット（実行はユーザーの操作）
    searchForm.value.summonerName = response.summonerName;
    searchForm.value.tagLine = response.tagLine;
  } catch (err: any) {
    const msg = err?.message || String(err);
    error.value = `[FEATURED] ${msg}`;
  } finally {
    userFetchLoading.value = false;
  }
};

// AI アドバイス生成（自動/再生成共通）
const generateAdviceHandler = async () => {
  if (!liveMatchData.value) return;
  if (adviceController) adviceController.abort();
  adviceController = new AbortController();
  isAdviceGenerating.value = true;
  error.value = "";
  aiAdvice.value = null;

  try {
    const now =
      typeof performance !== "undefined" && (performance as any)?.now
        ? () => performance.now()
        : () => Date.now();
    const start = now();

    const res = await generateAdvice(
      liveMatchData.value,
      selectedAiModel.value,
      adviceController
    );

    const end = now();
    aiDurationMs.value = Math.max(0, Math.round(end - start));
    aiAdvice.value = res;
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const msg =
      err?.data?.message || err?.statusMessage || err?.message || String(err);
    error.value = `[AI ${statusCode}] ${msg}`;
  } finally {
    isAdviceGenerating.value = false;
  }
};

// 自動生成を無効化: ユーザーがボタンを押すまで実行しない
// watch(
//   () => liveMatchData.value?.gameId,
//   async (id) => {
//     if (id && typeof window !== "undefined") await generateAdviceHandler();
//   },
//   { immediate: false }
// );

// 自動生成を無効化: ユーザーがボタンを押すまで実行しない
// watch(
//   () => matchData.value?.matchId,
//   async (id) => {
//     if (id && typeof window !== "undefined" && !postMatchAdvice.value)
//       await generatePostMatchAdvice();
//   },
//   { immediate: false }
// );

// 再生成ボタン
const onRegenerateAdvice = () => {
  if (!isAdviceGenerating.value) generateAdviceHandler();
};


// 分析結果をJSONファイルとしてダウンロード
const downloadMatchAnalysisAsJson = () => {
  if (!matchData.value) {
    console.warn("⚠️ 試合データがありません");
    return;
  }

  // 自分のアイテム購入履歴を抽出（AIと同じロジック）
  const myItemPurchases =
    matchData.value.timelineEvents?.filter(
      (event: any) => event.type === "ITEM" && event.isMyself === true
    ) || [];

  // AI入力パラメータと完全同一のデータを作成
  const aiInputData = {
    _metadata: {
      exportDate: new Date().toISOString(),
      exportType: "League of Legends AI入力パラメータ（デバッグ用）",
      purpose: "生成AIに送信されるデータと完全同一",
      version: "1.0.0",
    },
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
    // 以下、matchDataの全内容をそのまま展開（AIに送信される生データ）
    gameInfo: matchData.value.gameInfo,
    myTeam: matchData.value.myTeam,
    enemyTeam: matchData.value.enemyTeam,
    myParticipant: matchData.value.myParticipant,
    teamStats: matchData.value.teamStats,
    analysisSummary: matchData.value.analysisSummary,
    timelineEvents: matchData.value.timelineEvents || [],
  };

  // JSONファイルとしてダウンロード
  const jsonString = JSON.stringify(aiInputData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `LoL_AI_input_debug_${matchData.value.matchId}_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log("✅ AI入力パラメータをJSONファイルとしてダウンロードしました！");
};

// 試合後AI分析実行
const generatePostMatchAdvice = async () => {
  if (!matchData.value) {
    console.warn("⚠️ 試合データがありません");
    error.value = "試合データがないため、AI分析を実行できません";
    return;
  }

  // 既に実行中の場合は中止
  if (isPostMatchAdviceGenerating.value) {
    console.warn("⚠️ 既にAI分析実行中です");
    return;
  }

  isPostMatchAdviceGenerating.value = true;
  error.value = "";
  postMatchAdvice.value = null;

  // AbortControllerを設定
  postMatchAdviceController = new AbortController();

  const startTime = Date.now();

  try {
    console.log("🤖 試合後AI分析を開始します...");
    console.log("📊 分析対象試合:", {
      matchId: matchData.value.matchId,
      champion: matchData.value.myParticipant.championName,
      result: matchData.value.myParticipant.win ? "WIN" : "LOSE",
      kda: `${matchData.value.myParticipant.kills}/${matchData.value.myParticipant.deaths}/${matchData.value.myParticipant.assists}`,
    });

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
        model: selectedAiModel.value || undefined,
      },
      signal: postMatchAdviceController.signal,
    })) as any;

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.log("✅ 試合後AI分析完了!", {
      duration: `${durationMs}ms`,
      success: response.success,
    });

    if (response.success && response.analysis) {
      postMatchAdvice.value = response.analysis;

      // コンソールに分析結果を出力
      console.group("🤖 AI試合後分析結果");
      console.log(
        "📝 ゲーム全体の総評:",
        response.analysis["ゲーム全体の総評"]
      );
      console.log(
        "⚖️ 良かった点・悪かった点:",
        response.analysis["良かった点・悪かった点"]
      );
      console.log(
        "🔄 ターニングポイント分析:",
        response.analysis["ターニングポイント分析"]
      );
      console.log(
        "💡 具体的改善アドバイス:",
        response.analysis["具体的改善アドバイス"]
      );
      console.groupEnd();

      console.log("✅ AI試合後分析がConsoleに出力されました！");
    } else {
      throw new Error(
        "AI分析に失敗しました: " + (response.message || "不明なエラー")
      );
    }
  } catch (err: any) {
    console.error("❌ 試合後AI分析エラー:", err);

    if (err.name === "AbortError") {
      console.log("🛑 AI分析がキャンセルされました");
      error.value = "AI分析がキャンセルされました";
    } else {
      const errorMessage =
        err.message || err.data?.message || "AI分析でエラーが発生しました";
      error.value = `AI分析エラー: ${errorMessage}`;
    }
  } finally {
    isPostMatchAdviceGenerating.value = false;
    postMatchAdviceController = null;
  }
};

// 試合履歴から選択された試合の処理
const onMatchSelected = (matchId: string, selectedMatchData: MatchDetail) => {
  console.log("選択された試合:", matchId);

  // 試合詳細データをセット
  matchData.value = selectedMatchData;

  // 既存のライブマッチデータと分析結果をクリア
  liveMatchData.value = null;
  aiAdvice.value = null;
  aiDurationMs.value = null;
  postMatchAdvice.value = null;

  console.log("試合詳細が設定されました:", {
    matchId: selectedMatchData.matchId,
    champion: selectedMatchData.myParticipant?.championName,
    result: selectedMatchData.myParticipant?.win ? "WIN" : "LOSE",
  });
};

// メタ情報
useHead({
  title: "LoL Teacher",
  meta: [
    {
      name: "description",
      content: "League of Legends プレイヤー情報を検索・分析・学習するツール",
    },
  ],
});
</script>
