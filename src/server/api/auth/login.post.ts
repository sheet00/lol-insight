export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)
  const config = useRuntimeConfig()
  const appPassword = config.appPassword

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