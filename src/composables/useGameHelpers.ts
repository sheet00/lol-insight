/**
 * ゲーム関連ヘルパー機能用Composable
 */
export const useGameHelpers = () => {
  /**
   * ゲーム時間をフォーマット（秒 → MM:SS）
   */
  const formatGameTime = (seconds: number): string => {
    // 不正値/負値をガードしてMM:SSで表示
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = safeSeconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * ゲームモード名を取得
   */
  const formatGameMode = (queueId: number): string => {
    const queueNames: { [key: number]: string } = {
      420: 'ランク戦(ソロ/デュオ)',
      440: 'ランク戦(フレックス)',
      450: 'ARAM',
      400: 'ノーマル(ドラフト)',
      430: 'ノーマル(ブラインド)',
      900: 'ARURF',
      1020: 'ワンフォーオール',
      1300: 'ネクサスブリッツ',
      1400: 'アルティメットスペルブック',
      1700: 'アリーナ',
      1900: 'URF',
      2000: 'チュートリアル',
      2010: 'チュートリアル',
      2020: 'チュートリアル'
    }
    return queueNames[queueId] || `キューID: ${queueId}`
  }

  /**
   * ティアスコアをフォーマット
   */
  const formatTierScore = (score: number): string => {
    if (score >= 2800) return 'マスター+'
    if (score >= 2400) return 'ダイヤモンド'
    if (score >= 2000) return 'プラチナ'
    if (score >= 1600) return 'ゴールド'
    if (score >= 1200) return 'シルバー'
    if (score >= 800) return 'ブロンズ'
    return 'アイアン'
  }

  /**
   * サモナースペル名を取得
   */
  const getSummonerSpellName = (spellId: number): string => {
    const spellMap: { [key: number]: string } = {
      1: 'クレンズ', 3: 'イグゾースト', 4: 'フラッシュ', 6: 'ゴースト', 7: 'ヒール',
      11: 'スマイト', 12: 'テレポート', 13: 'クラリティ', 14: 'イグナイト', 21: 'バリア',
      30: 'ポロの王への道', 31: 'ポロダッシュ', 32: 'マーク/ダッシュ', 39: 'マーク',
      54: 'プレースホルダー', 55: 'プレースホルダー・スノーボール'
    }
    return spellMap[spellId] || `スペル${spellId}`
  }

  return {
    formatGameTime,
    formatGameMode,
    formatTierScore,
    getSummonerSpellName
  }
}
