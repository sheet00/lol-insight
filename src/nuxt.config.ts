export default defineNuxtConfig({
  // 2025年推奨設定
  compatibilityDate: "2024-09-19",

  nitro: {
    preset: "cloudflare_module",

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  devtools: { enabled: true },

  // SSR設定を明示的に指定
  ssr: true,

  // CSS フレームワーク
  css: ["~/assets/styles/main.css"],

  // モジュール
  modules: [
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "nuxt-auth-utils",
    "nitro-cloudflare-dev",
  ],

  // TypeScript 設定
  typescript: {
    strict: true,
    typeCheck: true,
  },

  // 開発時の警告を抑制
  experimental: {
    payloadExtraction: false,
  },

  // アプリケーション設定
  app: {
    head: {
      title: "LoL Teacher - League of Legends 分析ツール",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "League of Legends の試合データを分析し、AIによるアドバイスを提供するツール",
        },
      ],
    },
  },

  // サーバー設定（Docker用）
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },

  // 環境変数
  runtimeConfig: {
    // パブリック（クライアントサイドでも利用可能）
    public: {
      apiBase: "/api",
      // デフォルト値を設定。
      // この値は、環境変数 NUXT_PUBLIC_AVAILABLE_AI_MODELS によってランタイムで上書きされる。
      availableAiModels: "[]",
    },
  },
});
