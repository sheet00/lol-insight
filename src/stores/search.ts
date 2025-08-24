import { defineStore } from 'pinia';
import type {
  SummonerSearchResult,
  MatchDetail,
  LiveMatchDetail,
} from "~/types";
import { useMatchApi } from "@/composables/useMatchApi";

export const useSearchStore = defineStore('search', () => {
  // Composable
  const {
    searchSummoner: apiSearchSummoner,
    getLiveMatchInternal,
    fetchFeaturedUser,
    generateAdvice,
  } = useMatchApi();

  // リアクティブデータ (State)
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
  const aiDurationMs = ref<number | null>(null);

  const isPostMatchAdviceGenerating = ref(false);
  const postMatchAdvice = ref<any | null>(null);
  let postMatchAdviceController: AbortController | null = null;

  const selectedAiModel = ref("");

  // Actions
  const onModelChange = (model: string) => {
    selectedAiModel.value = model;
    if (liveMatchData.value && aiAdvice.value) {
      console.log("モデル変更により、アドバイス再生成が可能です");
    }
  };

  const search = async () => {
    if (!searchForm.value.summonerName.trim() || !searchForm.value.tagLine.trim()) {
      error.value = "サモナー名とタグラインを入力してください";
      return;
    }

    loading.value = true;
    error.value = "";
    summonerData.value = null;
    matchData.value = null;
    liveMatchData.value = null;
    aiAdvice.value = null;
    aiDurationMs.value = null;
    postMatchAdvice.value = null;

    if (adviceController) {
      adviceController.abort();
      adviceController = null;
    }
    isAdviceGenerating.value = false;

    try {
      const response = await apiSearchSummoner(
        searchForm.value.summonerName,
        searchForm.value.tagLine
      );
      summonerData.value = response;

      try {
        const liveData = await getLiveMatchInternal(response.account.puuid);
        liveMatchData.value = liveData;
        matchData.value = null;
      } catch (liveError) {
        liveMatchData.value = null;
        matchData.value = null;
      }
    } catch (err: any) {
      let errorMessage = "サモナー情報の取得に失敗しました";
      if (err.message) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      error.value = errorMessage;
    } finally {
      loading.value = false;
    }
  };

  const onFetchFeaturedUser = async () => {
    try {
      userFetchLoading.value = true;
      error.value = "";
      const response = await fetchFeaturedUser();
      searchForm.value.summonerName = response.summonerName;
      searchForm.value.tagLine = response.tagLine;
    } catch (err: any) {
      const msg = err?.message || String(err);
      error.value = `[FEATURED] ${msg}`;
    } finally {
      userFetchLoading.value = false;
    }
  };

  const generateAdviceHandler = async () => {
    if (!liveMatchData.value) return;
    if (adviceController) adviceController.abort();
    adviceController = new AbortController();
    isAdviceGenerating.value = true;
    error.value = "";
    aiAdvice.value = null;

    try {
      const now = performance ? () => performance.now() : () => Date.now();
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
      const msg = err?.data?.message || err?.statusMessage || err?.message || String(err);
      error.value = `[AI ${statusCode}] ${msg}`;
    } finally {
      isAdviceGenerating.value = false;
    }
  };

  const onRegenerateAdvice = () => {
    if (!isAdviceGenerating.value) generateAdviceHandler();
  };

  const onMatchSelected = (selectedMatchData: MatchDetail) => {
    matchData.value = selectedMatchData;
    liveMatchData.value = null;
    aiAdvice.value = null;
    aiDurationMs.value = null;
    postMatchAdvice.value = null;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return {
    searchForm,
    loading,
    userFetchLoading,
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
    onModelChange,
    search,
    onFetchFeaturedUser,
    generateAdviceHandler,
    onRegenerateAdvice,
    onMatchSelected,
  };
});
