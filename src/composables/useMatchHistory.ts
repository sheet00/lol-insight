/**
 * 試合履歴管理のcomposable
 */
import type {
  MatchHistoryItem,
  MatchHistoryResponse,
  MatchDetail,
} from "~/types";
import { useMatchApi } from "./useMatchApi";

export const useMatchHistory = () => {
  const { getMatchHistory, getMatchDetail } = useMatchApi();

  // リアクティブデータ
  const matchHistory = ref<MatchHistoryItem[]>([]);
  const currentPage = ref(0);
  const isHistoryLoading = ref(false);
  const selectedMatchId = ref<string | null>(null);
  const selectedMatchData = ref<MatchDetail | null>(null);
  const isMatchDetailLoading = ref(false);
  const hasMoreMatches = ref(true);
  const historyError = ref("");

  // 定数
  const MATCHES_PER_PAGE = 5;

  /**
   * 試合履歴をリセット
   */
  const resetHistory = () => {
    matchHistory.value = [];
    currentPage.value = 0;
    selectedMatchId.value = null;
    selectedMatchData.value = null;
    hasMoreMatches.value = true;
    historyError.value = "";
  };

  /**
   * 試合履歴を取得
   */
  const loadMatchHistory = async (puuid: string, page: number = 0) => {
    try {
      isHistoryLoading.value = true;
      historyError.value = "";

      const startIndex = page * MATCHES_PER_PAGE;
      const response: MatchHistoryResponse = await getMatchHistory(
        puuid,
        startIndex,
        MATCHES_PER_PAGE
      );

      if (page === 0) {
        // 初回ロード時は履歴をリセット
        matchHistory.value = response.matches;
      } else {
        // ページング時は既存の履歴に追加
        matchHistory.value = [...matchHistory.value, ...response.matches];
      }

      currentPage.value = page;
      hasMoreMatches.value = response.hasMore;
    } catch (error: any) {
      console.error("試合履歴取得エラー:", error);
      historyError.value = error.message || "試合履歴の取得に失敗しました";
    } finally {
      isHistoryLoading.value = false;
    }
  };

  /**
   * 次のページを読み込み
   */
  const loadNextPage = async (puuid: string) => {
    if (!hasMoreMatches.value || isHistoryLoading.value) {
      return;
    }

    await loadMatchHistory(puuid, currentPage.value + 1);
  };

  /**
   * 特定の試合詳細を取得
   */
  const loadMatchDetail = async (puuid: string, matchId: string) => {
    try {
      isMatchDetailLoading.value = true;
      historyError.value = "";

      const matchDetail: MatchDetail = await getMatchDetail(puuid, matchId);

      selectedMatchId.value = matchId;
      selectedMatchData.value = matchDetail;
    } catch (error: any) {
      console.error("試合詳細取得エラー:", error);
      historyError.value = error.message || "試合詳細の取得に失敗しました";
    } finally {
      isMatchDetailLoading.value = false;
    }
  };

  /**
   * 選択中の試合をクリア
   */
  const clearSelectedMatch = () => {
    selectedMatchId.value = null;
    selectedMatchData.value = null;
  };

  /**
   * 特定の試合が選択されているかチェック
   */
  const isMatchSelected = (matchId: string): boolean => {
    return selectedMatchId.value === matchId;
  };

  /**
   * 日時フォーマット関数
   */
  const formatMatchDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * 試合時間フォーマット関数
   */
  const formatGameDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return {
    // リアクティブデータ
    matchHistory,
    currentPage,
    isHistoryLoading,
    selectedMatchId,
    selectedMatchData,
    isMatchDetailLoading,
    hasMoreMatches,
    historyError,

    // メソッド
    resetHistory,
    loadMatchHistory,
    loadNextPage,
    loadMatchDetail,
    clearSelectedMatch,
    isMatchSelected,
    formatMatchDate,
    formatGameDuration,

    // 定数
    MATCHES_PER_PAGE,
  };
};
