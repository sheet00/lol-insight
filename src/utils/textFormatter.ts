/**
 * テキストフォーマット用ユーティリティ関数
 */

/**
 * 「。」の後に改行を追加するフォーマット関数
 * HTMLエスケープを行い、安全にv-htmlで使用できる形式に変換する
 * 
 * @param text - フォーマット対象のテキスト
 * @returns HTMLエスケープ済み＋改行処理済みのテキスト
 */
export const formatTextWithBreaks = (text: string): string => {
  if (!text) return ''
  
  // HTMLエスケープを行い、「。」の後に<br>を追加
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/。/g, '。<br>')
}