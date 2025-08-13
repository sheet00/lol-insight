/**
 * マッチAPI関連のcomposable
 */
import type { SummonerSearchResult, MatchDetail, LiveMatchDetail } from "~/types";
import { createGetChampionName } from "@/utils/championUtils";
import championData from "@/data/champion.json";

export const useMatchApi = () => {
  // チャンピオン名取得関数をセットアップ
  const championIdMap = Object.fromEntries(
    Object.values(championData.data).map((champion: any) => [
      parseInt(champion.key),
      champion.name
    ])
  );
  const getChampionNameById = createGetChampionName(championIdMap);
  /**
   * サモナー検索処理
   */
  const searchSummoner = async (summonerName: string, tagLine: string): Promise<SummonerSearchResult> => {
    if (!summonerName.trim() || !tagLine.trim()) {
      throw new Error("サモナー名とタグラインを入力してください");
    }

    const response = await $fetch<SummonerSearchResult>("/api/summoner/search", {
      method: "POST",
      body: {
        summonerName: summonerName.trim(),
        tagLine: tagLine.trim(),
      },
    });

    return response;
  };

  /**
   * 進行中試合情報取得処理（内部用）
   */
  const getLiveMatchInternal = async (puuid: string): Promise<LiveMatchDetail> => {
    const response = await $fetch<LiveMatchDetail>("/api/match/live", {
      method: "POST",
      body: {
        puuid: puuid,
      },
    });

    return response;
  };

  /**
   * 最新試合情報取得処理（内部用）
   */
  const getLatestMatchInternal = async (puuid: string): Promise<MatchDetail> => {
    const response = await $fetch<MatchDetail>("/api/match/latest", {
      method: "POST",
      body: {
        puuid: puuid,
      },
    });

    return response;
  };

  /**
   * Featured Games から実行中ユーザーを取得
   */
  const fetchFeaturedUser = async () => {
    const res = await $fetch<{
      puuid: string;
      summonerName?: string | null;
      gameName?: string | null;
      tagLine?: string | null;
      sampleGameId?: number | null;
    }>("/api/test/live", { method: "GET" });
    
    const gn = (res.gameName || res.summonerName || "").toString();
    const tl = (res.tagLine || "").toString() || "JP1";
    
    if (!gn) {
      throw new Error("実行中ユーザーのサモナー名を取得できませんでした");
    }
    
    return { summonerName: gn, tagLine: tl };
  };

  /**
   * AI アドバイス生成
   */
  const generateAdvice = async (
    liveMatchData: LiveMatchDetail,
    selectedAiModel: string,
    controller: AbortController
  ) => {
    const lm = liveMatchData as LiveMatchDetail;
    const myChampionData = {
      championName: getChampionNameById(lm.myParticipant.championId),
      puuid: lm.myParticipant.puuid,
      rank: lm.myParticipant.rank,
      summonerLevel: lm.myParticipant.summonerLevel,
      teamId: lm.myParticipant.teamId,
    };

    const body = {
      gameId: String(lm.gameId),
      gameInfo: {
        gameMode: lm.gameInfo.gameMode,
        queueId: lm.gameInfo.queueId,
      },
      myChampion: myChampionData,
      myTeam: lm.myTeam.map((p: any) => ({
        championName: getChampionNameById(p.championId),
        rank: p.rank,
        summonerLevel: p.summonerLevel,
        role: undefined,
        teamId: p.teamId,
        isMyself: p.puuid === lm.myParticipant.puuid,
      })),
      enemyTeam: lm.enemyTeam.map((p: any) => ({
        championName: getChampionNameById(p.championId),
        rank: p.rank,
        summonerLevel: p.summonerLevel,
        role: undefined,
        teamId: p.teamId,
      })),
      model: selectedAiModel || undefined,
    };

    const res: any = await $fetch("/api/advice/generate", {
      method: "POST",
      body,
      signal: controller.signal,
    });

    return res;
  };

  return {
    searchSummoner,
    getLiveMatchInternal,
    getLatestMatchInternal,
    fetchFeaturedUser,
    generateAdvice,
  };
};