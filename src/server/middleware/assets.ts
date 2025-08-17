/**
 * Cloudflare Workers用静的ファイルMIMEタイプ修正ミドルウェア
 */

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  
  // _nuxtディレクトリの静的ファイルのMIMEタイプを修正
  if (url.pathname.startsWith('/_nuxt/')) {
    const ext = url.pathname.split('.').pop()?.toLowerCase()
    
    // 正しいContent-Typeを設定
    switch (ext) {
      case 'css':
        setHeader(event, 'Content-Type', 'text/css; charset=utf-8')
        break
      case 'js':
      case 'mjs':
        setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')
        break
      case 'woff2':
        setHeader(event, 'Content-Type', 'font/woff2')
        break
      case 'woff':
        setHeader(event, 'Content-Type', 'font/woff')
        break
      case 'ttf':
        setHeader(event, 'Content-Type', 'font/ttf')
        break
      case 'png':
        setHeader(event, 'Content-Type', 'image/png')
        break
      case 'jpg':
      case 'jpeg':
        setHeader(event, 'Content-Type', 'image/jpeg')
        break
      case 'svg':
        setHeader(event, 'Content-Type', 'image/svg+xml')
        break
      case 'ico':
        setHeader(event, 'Content-Type', 'image/x-icon')
        break
      case 'json':
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        break
    }
    
    // キャッシュヘッダーも設定
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    
    // X-Content-Type-Optionsを削除して、MIMEタイプスニッフィングを許可
    setHeader(event, 'X-Content-Type-Options', '')
  }
})