/**
 * 試合前データ管理用Composable
 */
import type { LiveMatchDetail, MatchDetail } from '@/types'

export const usePreMatchData = () => {
  const liveMatchData = ref<LiveMatchDetail | null>(null)
  const matchData = ref<MatchDetail | null>(null)
  const loadingMatch = ref(false)

  /**
   * 進行中試合情報取得（内部用）
   */
  const getLiveMatchInternal = async (puuid: string) => {
    const response = await $fetch<LiveMatchDetail>('/api/match/live', {
      method: 'POST',
      body: { puuid }
    })

    liveMatchData.value = response
    matchData.value = null // 進行中試合がある場合は過去試合データをクリア
    console.log('進行中試合情報取得成功:', response)
  }

  /**
   * 最新試合情報取得（内部用）
   */
  const getLatestMatchInternal = async (puuid: string) => {
    const response = await $fetch<MatchDetail>('/api/match/latest', {
      method: 'POST',
      body: { puuid }
    })

    matchData.value = response
    liveMatchData.value = null // 過去試合がある場合は進行中試合データをクリア
    console.log('最新試合情報取得成功:', response)
  }

  /**
   * 試合情報を自動取得（進行中→過去の順）
   */
  const fetchMatchData = async (puuid: string) => {
    try {
      console.log('プレイヤー情報取得成功、進行中試合をチェック中...')
      await getLiveMatchInternal(puuid)
    } catch (liveError) {
      console.log('進行中試合なし、過去試合を取得中...')
      try {
        await getLatestMatchInternal(puuid)
      } catch (matchError) {
        console.warn('過去試合情報の取得にも失敗:', matchError)
        matchData.value = null
        liveMatchData.value = null
        throw matchError
      }
    }
  }

  /**
   * 最新試合情報取得処理（ボタン用）
   */
  const getLatestMatch = async (puuid: string) => {
    if (!puuid) {
      throw new Error('まずプレイヤー情報を取得してください')
    }

    loadingMatch.value = true

    try {
      await getLatestMatchInternal(puuid)
    } catch (err: any) {
      console.error('最新試合情報取得エラー:', err)
      
      let errorMessage = '最新試合情報の取得に失敗しました'
      
      if (err.data?.message) {
        errorMessage = err.data.message
      } else if (err.statusMessage) {
        errorMessage = err.statusMessage
      } else if (err.message) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      throw new Error(errorMessage)
    } finally {
      loadingMatch.value = false
    }
  }

  /**
   * データリセット
   */
  const resetMatchData = () => {
    liveMatchData.value = null
    matchData.value = null
  }

  return {
    liveMatchData: readonly(liveMatchData),
    matchData: readonly(matchData),
    loadingMatch: readonly(loadingMatch),
    fetchMatchData,
    getLatestMatch,
    resetMatchData
  }
}
