/**
 * 【開発用テストデータ取得API】
 * 
 * 目的: 開発・デバッグ時に実際のゲームデータを使用してテストを行う
 * 
 * 機能:
 * - Featured Games APIからCLASSICモードの進行中試合を取得
 * - リトライ機能付きで安定したテストデータの確保
 * - 取得した試合の参加者からテスト用PUUIDとRiot IDを抽出
 * - フロントエンド開発時のモックデータとして活用
 * - 指数関数バックオフによる効率的なAPI呼び出し制御
 */
import { defineEventHandler, createError } from "h3";
import { RiotApiManager } from "~/server/utils/RiotApiManager";

// CLASSICモード試合取得専用のリトライ機能（指数関数バックオフ版）
async function retryUntilClassicFound(
  riot: any,
  maxRetries: number = 10,
  baseDelay_ms: number = 1000,
  maxDelay_ms: number = 30000
): Promise<any[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[CLASSIC取得] 試行 ${attempt}/${maxRetries} 開始`);

      const featured = await riot.getFeaturedGames();
      const games: any[] = featured?.gameList || featured?.game_list || [];

      console.log(`[CLASSIC取得] 取得した試合数: ${games.length}`);
      console.log(
        `[CLASSIC取得] ゲームモード:`,
        games.map((g) => g.gameMode)
      );

      const classicGames = games.filter(
        (game: any) => game.gameMode === "CLASSIC"
      );

      if (classicGames.length > 0) {
        console.log(
          `[CLASSIC取得] 試行 ${attempt}/${maxRetries} でCLASSIC試合 ${classicGames.length}件 発見！`
        );
        return classicGames;
      }

      if (attempt === maxRetries) {
        console.error(
          `[CLASSIC取得] ${maxRetries}回試行してもCLASSIC試合が見つかりませんでした`
        );
        throw new Error("CLASSICモードの注目試合が見つかりませんでした");
      }

      // 指数関数バックオフ: delay_ms = baseDelay_ms * (2 ^ (attempt - 1)) + ジッター
      const exponentialDelay_ms = baseDelay_ms * Math.pow(2, attempt - 1);
      const jitter_ms = Math.random() * 500; // 0-500msのランダムジッター
      const delay_ms = Math.min(exponentialDelay_ms + jitter_ms, maxDelay_ms);

      console.log(
        `[CLASSIC取得] 試行 ${attempt}/${maxRetries} - CLASSIC試合なし。${Math.round(delay_ms)}ms待機後再試行... (指数関数バックオフ)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay_ms));
      
    } catch (error) {
      console.warn(
        `[CLASSIC取得] 試行 ${attempt}/${maxRetries} エラー:`,
        error
      );

      if (attempt === maxRetries) {
        throw error;
      }

      // エラー時も指数関数バックオフを適用
      const exponentialDelay_ms = baseDelay_ms * Math.pow(2, attempt - 1);
      const jitter_ms = Math.random() * 500;
      const delay_ms = Math.min(exponentialDelay_ms + jitter_ms, maxDelay_ms);

      console.log(`[CLASSIC取得] ${Math.round(delay_ms)}ms待機後、再試行します... (指数関数バックオフ)`);
      await new Promise((resolve) => setTimeout(resolve, delay_ms));
    }
  }

  throw new Error("CLASSICモードの注目試合が見つかりませんでした");
}

export default defineEventHandler(async () => {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: "Riot API キーが未設定です",
    });
  }

  const riot = new RiotApiManager(apiKey);
  try {
    console.log("[DEBUG] CLASSIC試合取得開始");
    // CLASSICモードの試合が見つかるまでリトライ
    const classicGames = await retryUntilClassicFound(riot);

    // フィルタリングされた先頭のゲームから先頭の参加者を選ぶ
    const firstGame = classicGames[0];
    const participants: any[] = firstGame?.participants || [];
    if (!participants.length) {
      throw createError({
        statusCode: 404,
        message: "参加者情報が見つかりませんでした",
      });
    }
    const p0 = participants[0];
    let puuid: string | null = p0?.puuid || null;
    let summonerName: string | null = p0?.summonerName || null;
    // puuid が無ければ、summonerName から取得を試みる
    if (!puuid && summonerName) {
      const s = await riot.getSummonerByName(summonerName);
      puuid = s?.puuid || null;
    }
    if (!puuid) {
      throw createError({
        statusCode: 500,
        message: "テスト用プレイヤーの PUUID 解決に失敗しました",
      });
    }
    // アカウントから Riot ID を取得
    let gameName: string | null = null;
    let tagLine: string | null = null;
    try {
      const acc = await riot.getAccountByPuuid(puuid);
      gameName = acc?.gameName || null;
      tagLine = acc?.tagLine || null;
    } catch {}
    return {
      puuid,
      summonerName,
      gameName,
      tagLine,
      sampleGameId: firstGame?.gameId || null,
    };
  } catch (e: any) {
    throw createError({
      statusCode: e?.statusCode || 500,
      message: e?.message || "テスト用 LIVE データ取得に失敗しました",
    });
  }
});
