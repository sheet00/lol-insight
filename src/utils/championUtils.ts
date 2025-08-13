/**
 * チャンピオン・サモナースペル関連のユーティリティ関数
 */

/**
 * チャンピオンIDマップを作成する関数
 */
export const createChampionIdMap = (championData: any): { [key: number]: string } => {
  const championIdMap: { [key: number]: string } = {};
  if (championData?.data && typeof championData.data === "object") {
    Object.values(championData.data).forEach((champion: any) => {
      if (champion?.key && champion?.name) {
        championIdMap[parseInt(champion.key)] = champion.name;
      }
    });
  }
  return championIdMap;
};

/**
 * チャンピオン名取得関数ファクトリー
 */
export const createGetChampionName = (championIdMap: { [key: number]: string }) => {
  return (championId: number): string => {
    return championIdMap[championId] || `Champion ${championId}`;
  };
};

/**
 * サモナースペル名取得関数
 */
export const getSummonerSpellName = (spellId: number): string => {
  const spellMap: { [key: number]: string } = {
    1: "Cleanse",
    3: "Exhaust",
    4: "Flash",
    6: "Ghost",
    7: "Heal",
    11: "Smite",
    12: "Teleport",
    13: "Clarity",
    14: "Ignite",
    21: "Barrier",
    32: "Mark/Dash",
  };
  return spellMap[spellId] || `Spell ${spellId}`;
};