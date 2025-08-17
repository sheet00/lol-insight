export default defineEventHandler(async (event) => {
  // セッションをクリア
  await clearUserSession(event)
  
  return { success: true, message: 'ログアウトしました' }
})