export default defineNuxtRouteMiddleware(async (to, from) => {
  // クライアントサイドのみで実行
  if (process.server) return

  const authStore = useAuthStore()
  
  // ログインページは認証チェックをスキップ
  if (to.path === '/login') {
    return
  }

  // セッションストレージから認証状態を復元
  authStore.initializeAuthFromSession()

  // サーバーサイドで認証状態を確認
  try {
    await authStore.checkAuth()
  } catch (error) {
    console.error('認証確認エラー:', error)
  }

  // 未認証の場合はログインページにリダイレクト
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})