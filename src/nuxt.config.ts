export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-08-11',
  
  // CSS フレームワーク
  css: ['~/assets/styles/main.css'],
  
  // モジュール
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  // TypeScript 設定
  typescript: {
    strict: true,
    typeCheck: true
  },

  // アプリケーション設定
  app: {
    head: {
      title: 'LoL Insight - League of Legends 分析ツール',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'League of Legends の試合データを分析し、AIによるアドバイスを提供するツール'
        }
      ]
    }
  },

  // サーバー設定（Docker用）
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  // 環境変数
  runtimeConfig: {
    // プライベート（サーバーサイドのみ）
    riotApiKey: process.env.RIOT_API_KEY,
    
    // パブリック（クライアントサイドでも利用可能）
    public: {
      apiBase: '/api'
    }
  }
})