/**
 * チャンピオンデータ管理用Composable
 */
import championData from '@/data/champion.json'

// チャンピオンIDマップを初期化時に作成
const championIdMap: { [key: number]: string } = {}
Object.values(championData.data).forEach((champion: any) => {
  championIdMap[parseInt(champion.key)] = champion.name
})

export const useChampionData = () => {
  /**
   * チャンピオンIDから日本語名を取得
   */
  const getChampionName = (championId: number): string => {
    return championIdMap[championId] || `Champion ${championId}`
  }

  /**
   * チャンピオンデータ全体を取得
   */
  const getChampionData = () => {
    return championData
  }

  /**
   * チャンピオンIDマップを取得
   */
  const getChampionIdMap = () => {
    return championIdMap
  }

  return {
    getChampionName,
    getChampionData,
    getChampionIdMap
  }
}