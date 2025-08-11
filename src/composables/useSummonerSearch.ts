/**
 * サモナー検索機能用Composable
 */
import type { SummonerSearchResult } from '@/types'

export const useSummonerSearch = () => {
  const summonerData = ref<SummonerSearchResult | null>(null)
  const loading = ref(false)
  const error = ref('')

  /**
   * サモナー情報検索
   */
  const searchSummoner = async (summonerName: string, tagLine: string) => {
    if (!summonerName.trim() || !tagLine.trim()) {
      error.value = 'ゲーム名とタグラインを入力してください'
      return null
    }

    loading.value = true
    error.value = ''

    try {
      console.log('サモナー検索開始:', { summonerName, tagLine })
      
      const response = await $fetch<SummonerSearchResult>('/api/summoner/search', {
        method: 'POST',
        body: {
          summonerName: summonerName.trim(),
          tagLine: tagLine.trim()
        }
      })

      console.log('サモナー検索成功:', response)
      summonerData.value = response
      return response
      
    } catch (err: any) {
      console.error('サモナー検索エラー:', err)
      
      // エラー内容を詳しく表示
      let errorMessage = 'サモナー情報の取得に失敗しました'
      
      if (err.data?.message) {
        errorMessage = err.data.message
      } else if (err.statusMessage) {
        errorMessage = err.statusMessage
      } else if (err.message) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      error.value = errorMessage
      summonerData.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * データリセット
   */
  const resetData = () => {
    summonerData.value = null
    error.value = ''
  }

  return {
    summonerData: readonly(summonerData),
    loading: readonly(loading),
    error: readonly(error),
    searchSummoner,
    resetData
  }
}
