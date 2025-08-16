<template>
  <div class="min-h-screen bg-gray-50">
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
    <div class="w-full mx-auto px-4 py-10 mt-16">
      <div class="main-content-width mx-auto">
        <!-- 分析対象プレイヤー表示 -->
        <div
          v-if="summonerData && !matchData && !liveMatchData"
          class="card text-center"
        >
          <div class="py-8">
            <div class="text-2xl font-bold text-gray-900 mb-2">
              {{ summonerData.account.gameName }}#{{
                summonerData.account.tagLine
              }}
            </div>
            <div class="text-gray-600 mb-4">
              プレイヤーの試合情報を分析中...
            </div>
            <div
              class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
            ></div>
          </div>
        </div>

        <!-- 進行中試合分析結果 -->
        <LiveMatch
          v-if="liveMatchData"
          :live-match-data="liveMatchData"
          :ai-advice="aiAdvice"
          :is-advice-generating="isAdviceGenerating"
          :ai-duration-ms="aiDurationMs"
          @regenerate-advice="onRegenerateAdvice"
        />

        <!-- 過去試合分析結果 -->
        <CompletedMatch
          v-if="matchData"
          :match-data="matchData"
          :show-timeline="showTimeline"
          :is-generating-advice="isPostMatchAdviceGenerating"
          :has-advice="!!postMatchAdvice"
          @output-to-console="outputMatchAnalysisToConsole"
          @toggle-timeline="toggleTimeline"
          @generate-post-match-advice="generatePostMatchAdvice"
        />

        <!-- AI試合後分析結果 -->
        <PostMatchAnalysis v-if="postMatchAdvice" :advice="postMatchAdvice" />

        <!-- エラー表示 -->
        <div v-if="error" class="card bg-red-50 border-red-200">
          <div class="flex items-center">
            <div class="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 class="text-lg font-semibold text-red-800">
                エラーが発生しました
              </h3>
              <p class="text-red-700">{{ error }}</p>
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
import SearchHeader from "~/components/SearchHeader.vue";
import LiveMatch from "~/components/LiveMatch.vue";
import CompletedMatch from "~/components/CompletedMatch.vue";
import PostMatchAnalysis from "~/components/PostMatchAnalysis.vue";
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

// タイムライン表示状態（デフォルト非表示）
const showTimeline = ref(false);

// モデル変更時の処理
const onModelChange = (model: string) => {
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
      console.log("進行中試合なし、過去試合を取得中...");
      // 進行中試合がない場合、過去の試合を取得
      try {
        const latestMatchData = await getLatestMatchInternal(
          response.account.puuid
        );
        matchData.value = latestMatchData;
        liveMatchData.value = null;
      } catch (matchError) {
        console.warn("過去試合情報の取得にも失敗:", matchError);
        matchData.value = null;
        liveMatchData.value = null;
      }
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

// タイムライン折りたたみトグル
const toggleTimeline = () => {
  showTimeline.value = !showTimeline.value;
};

// 完了試合分析結果をConsole.logに出力
const outputMatchAnalysisToConsole = () => {
  if (!matchData.value) {
    console.warn("⚠️ 試合データがありません");
    return;
  }

  console.group("🎮 League of Legends 完了試合分析結果");

  // analysisSummaryが存在する場合はそれを出力、なければ従来の構造を出力
  if (matchData.value.analysisSummary) {
    console.log(
      "📊 詳細分析サマリー:",
      JSON.stringify(matchData.value.analysisSummary, null, 2)
    );
  } else {
    console.log("⚠️ 詳細分析サマリーが生成されていません");
  }

  // 基本試合情報
  console.group("🏟️ 基本試合情報");
  console.log("試合ID:", matchData.value.matchId);
  console.log(
    "ゲームモード:",
    formatGameMode(matchData.value.gameInfo.queueId)
  );
  console.log(
    "試合時間:",
    Math.floor(matchData.value.gameInfo.gameDuration / 60) +
      "分" +
      (matchData.value.gameInfo.gameDuration % 60) +
      "秒"
  );
  console.log(
    "結果:",
    matchData.value.myParticipant.win ? "勝利 🎉" : "敗北 😢"
  );
  console.groupEnd();

  // プレイヤー情報
  console.group("👤 自分のパフォーマンス");
  const myPlayer = matchData.value.myParticipant;
  console.log("チャンピオン:", getChampionName(myPlayer.championId));
  console.log(
    "KDA:",
    `${myPlayer.kills}/${myPlayer.deaths}/${myPlayer.assists}`
  );
  console.log(
    "ダメージ:",
    myPlayer.totalDamageDealtToChampions.toLocaleString()
  );
  console.log("ゴールド:", myPlayer.goldEarned.toLocaleString());
  console.log("CS:", myPlayer.totalMinionsKilled);
  if (myPlayer.rank) {
    console.log(
      "ランク:",
      `${myPlayer.rank.tier} ${myPlayer.rank.rank} (${myPlayer.rank.leaguePoints}LP)`
    );
  }
  console.groupEnd();

  // チーム成績
  console.group("⚔️ チーム成績比較");
  const teamStats = matchData.value.teamStats;
  console.table({
    自チーム: {
      勝利: teamStats.myTeam.win ? "✅" : "❌",
      キル: teamStats.myTeam.objectives.champion.kills,
      タワー: teamStats.myTeam.objectives.tower.kills,
      ドラゴン: teamStats.myTeam.objectives.dragon.kills,
      バロン: teamStats.myTeam.objectives.baron.kills,
      ゴールド: teamStats.myTeam.totalGold.toLocaleString(),
    },
    敵チーム: {
      勝利: teamStats.enemyTeam.win ? "✅" : "❌",
      キル: teamStats.enemyTeam.objectives.champion.kills,
      タワー: teamStats.enemyTeam.objectives.tower.kills,
      ドラゴン: teamStats.enemyTeam.objectives.dragon.kills,
      バロン: teamStats.enemyTeam.objectives.baron.kills,
      ゴールド: teamStats.enemyTeam.totalGold.toLocaleString(),
    },
  });
  console.groupEnd();

  // 全プレイヤー統計
  console.group("📈 全プレイヤー統計");
  const allPlayers = [...matchData.value.myTeam, ...matchData.value.enemyTeam];
  const playersTable = allPlayers.map((player) => ({
    チャンピオン: getChampionName(player.championId),
    チーム:
      player.teamId === matchData.value!.myParticipant.teamId
        ? "自チーム"
        : "敵チーム",
    KDA: `${player.kills}/${player.deaths}/${player.assists}`,
    ダメージ: player.totalDamageDealtToChampions.toLocaleString(),
    ゴールド: player.goldEarned.toLocaleString(),
    CS: player.totalMinionsKilled,
    ランク: player.rank
      ? `${player.rank.tier} ${player.rank.rank}`
      : "Unranked",
  }));
  console.table(playersTable);
  console.groupEnd();

  // タイムライン情報
  if (
    matchData.value.timelineEvents &&
    matchData.value.timelineEvents.length > 0
  ) {
    console.group("⏰ 重要タイムラインイベント");
    console.log(
      "タイムラインイベント数:",
      matchData.value.timelineEvents.length
    );

    // イベントタイプ別に分類
    const eventsByType = matchData.value.timelineEvents.reduce(
      (acc: any, event: any) => {
        acc[event.type] = acc[event.type] || [];
        acc[event.type].push(event);
        return acc;
      },
      {}
    );

    // タイプ別にテーブル表示
    const typeIcons: { [key: string]: string } = {
      KILL: "💀",
      MONSTER: "🐉",
      BUILDING: "🏗️",
      ITEM: "🛒",
      LEVEL: "⬆️",
      PLATE: "🛡️",
    };

    Object.keys(eventsByType).forEach((type) => {
      const icon = typeIcons[type] || "📌";
      console.group(`${icon} ${type}イベント (${eventsByType[type].length}件)`);
      const eventsTable = eventsByType[type].map((event: any) => ({
        時間: event.timeString,
        説明: event.description,
        優先度: event.priority,
      }));
      console.table(eventsTable);
      console.groupEnd();
    });

    // 生JSONも出力
    console.log(
      "Timeline Events JSON:",
      JSON.stringify(matchData.value.timelineEvents, null, 2)
    );
    console.groupEnd();
  } else {
    console.log("⚠️ タイムライン情報が含まれていません");
  }

  // 生データも出力
  console.group("💾 完全な試合データ (JSON)");
  console.log("Full Match Data:", JSON.stringify(matchData.value, null, 2));
  console.groupEnd();

  console.groupEnd(); // メイングループの終了

  // 成功メッセージ
  console.log("✅ 完了試合分析結果がConsoleに出力されました！");
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
