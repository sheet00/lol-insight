import { defineEventHandler } from 'h3'

// Cloudflare D1 の env をグローバルに流すミドルウェア
// DrizzleDatabaseManager はここで設定された __CLOUDFLARE_ENV__ を参照する
export default defineEventHandler((event) => {
  try {
    // ローカル開発（NODE_ENV=development）ではD1を有効化しない
    if (process?.env?.NODE_ENV === 'development') {
      return
    }
    const env = (event as any)?.context?.cloudflare?.env
    if (env) {
      ;(globalThis as any).__CLOUDFLARE_ENV__ = env
    }
  } catch {
    // noop
  }
})
