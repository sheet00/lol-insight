export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const appPassword = config.appPassword

  // パスワードが設定されていない場合は常に認証済みとする
  if (!appPassword) {
    return { authenticated: true }
  }

  // セッションから認証状態を確認
  const session = await getUserSession(event)
  
  return { 
    authenticated: !!session?.authenticated 
  }
})