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
import { usePostMatchAnalysis } from '@/composables/usePostMatchData';
import type {
  MatchDetail,
} from "~/types";
import PreMatch from "~/components/pre-match/PreMatch.vue";
import PostMatch from "~/components/post-match/PostMatch.vue";
import MatchHistoryList from "~/components/post-match/MatchHistoryList.vue";

// インデックスページ専用スタイル
import "@/assets/styles/components/IndexPage.css";

/**
 * Searchストアから状態とメソッドを取得
 */
const searchStore = useSearchStore();

/**
 * リアクティブな状態を取得
 * - loading: 読み込み中フラグ
 * - summonerData: サモナー情報
 * - matchData: 過去試合データ
 * - liveMatchData: 進行中試合データ
 * - error: エラーメッセージ
 * - aiAdvice: 試合前AIアドバイス
 * - isAdviceGenerating: 試合前AI分析中フラグ
 * - aiDurationMs: AI分析にかかった時間
 * - selectedAiModel: 選択されたAIモデル
 */
const {
  loading,
  summonerData,
  matchData,
  liveMatchData,
  error,
  aiAdvice,
  isAdviceGenerating,
  aiDurationMs,
  selectedAiModel,
} = storeToRefs(searchStore);

/**
 * ストアのメソッドを取得
 */
const { onRegenerateAdvice, onMatchSelected: storeOnMatchSelected } = searchStore;

/**
 * 試合後AI分析＆データ最適化コンポーザブルから状態とメソッドを取得
 * - isPostMatchAdviceGenerating: 試合後AI分析中フラグ
 * - postMatchAdvice: 試合後AI分析結果
 * - executePostMatchAdvice: 試合後AI分析を実行するメソッド
 * - cancelPostMatchAdvice: 試合後AI分析をキャンセルするメソッド
 * - downloadOptimizedDataAsJson: 最適化されたデータをJSONダウンロードするメソッド
 */
const {
  isPostMatchAdviceGenerating,
  postMatchAdvice,
  generatePostMatchAdvice: executePostMatchAdvice,
  cancelPostMatchAdvice,
  downloadOptimizedDataAsJson,
} = usePostMatchAnalysis();

/**
 * 試合後AI分析を実行する
 * エラーハンドリングを含む上位レベルのラッパー関数
 */
const generatePostMatchAdvice = async () => {
  try {
    await executePostMatchAdvice(matchData.value, selectedAiModel.value);
  } catch (err: any) {
    if (err.name === "AbortError") {
      error.value = "AI分析がキャンセルされました";
    } else {
      error.value = `AI分析エラー: ${err.message || err.data?.message}`;
    }
  }
};

/**
 * 最適化された試合データをJSONファイルとしてダウンロードする
 * AI分析で使用される実際のデータを確認するためのデバッグ機能
 */
const downloadMatchAnalysisAsJson = () => {
  downloadOptimizedDataAsJson(matchData.value);
};

/**
 * 試合履歴から試合が選択された時の処理
 * @param _matchId 試合ID（使用しないためアンダースコア付き）
 * @param selectedMatchData 選択された試合データ
 */
const onMatchSelected = (_matchId: string, selectedMatchData: MatchDetail) => {
  storeOnMatchSelected(selectedMatchData);
};

/**
 * ページのメタ情報設定
 * SEO対策とブラウザタブの表示内容を設定
 */
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
