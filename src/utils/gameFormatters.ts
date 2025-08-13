/**
 * ゲーム関連のフォーマット用ユーティリティ関数
 */

/**
 * ゲームモード表示用関数
 */
export const formatGameMode = (queueId: number): string => {
  const queueMap: { [key: number]: string } = {
    420: "ランクソロ/デュオ",
    440: "ランクフレックス",
    450: "ARAM",
    480: "カジュアル",
    830: "Co-op vs AI",
    400: "ノーマルドラフト",
    430: "ノーマルブラインド",
  };
  return queueMap[queueId] || `ゲームモード (${queueId})`;
};

/**
 * ゲーム時間表示用関数
 */
export const formatGameTime = (seconds: number): string => {
  // 不正値や負の秒数を0に丸めてMM:SS表示
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * 数値の3桁カンマ区切り
 */
export const formatNumber = (val: number | null | undefined): string => {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '0'
  return Math.round(val).toLocaleString('ja-JP')
}

/**
 * ティアスコアをランク名+数値形式でフォーマット
 */
export const formatTierScore = (tierScore: number): string => {
  const tierNames = [
    "",
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ];
  const baseTier = Math.floor(tierScore);
  const tierName = tierNames[baseTier] || "Unranked";

  if (baseTier >= 8) {
    // Master以上はランクなし、数値のみ
    return `${tierName}${tierScore.toFixed(1)}`;
  } else if (baseTier >= 1) {
    // 通常ティアは名前+数値
    return `${tierName}${tierScore.toFixed(1)}`;
  } else {
    return "Unranked";
  }
};