export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)
  const config = useRuntimeConfig()
  // Cloudflare ランタイムのENVを最優先で参照し、なければruntimeConfigを使う
  // event.context.cloudflare?.env は cloudflare_module プリセットで利用可能
  const cfEnv = (event as any)?.context?.cloudflare?.env as
    | { APP_PASSWORD?: string }
    | undefined
  const appPassword = cfEnv?.APP_PASSWORD ?? config.appPassword

  // パスワードが設定されていない場合は認証をスキップ
  if (!appPassword) {
    await setUserSession(event, { authenticated: true })
    return { success: true, message: 'ログインしました' }
  }

  // パスワード検証
  if (password !== appPassword) {
    return { success: false, message: 'パスワードが正しくありません' }
  }

  // セッションに認証情報を保存
  await setUserSession(event, { authenticated: true })

  return { success: true, message: 'ログインしました' }
})
