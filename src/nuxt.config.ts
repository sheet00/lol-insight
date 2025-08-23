export default defineNuxtConfig({
  // 2025年推奨設定
  compatibilityDate: "2024-09-19",
  
  nitro: {
    preset: "cloudflare_module",

    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  devtools: { enabled: true },

  // SSR設定を明示的に指定
  ssr: true,

  // CSS フレームワーク
  css: ["~/assets/styles/main.css"],

  // モジュール
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "nuxt-auth-utils", "nitro-cloudflare-dev"],

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
    // プライベート（サーバーサイドのみ）
    riotApiKey: process.env.RIOT_API_KEY,
    appPassword: process.env.APP_PASSWORD,
    // セッション（nuxt-auth-utils 用）
    session: {
      // Cloudflare Secrets: NUXT_SESSION_PASSWORD に設定する
      // 型の都合で空文字を初期値にし、実運用ではSecretで上書きする
      password: process.env.NUXT_SESSION_PASSWORD || "",
    },
    openRouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
      baseURL:
        process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    },

    // パブリック（クライアントサイドでも利用可能）
    public: {
      apiBase: "/api",
      availableAiModels: (() => {
        try {
          return JSON.parse(
            process.env.AVAILABLE_AI_MODELS || '["google/gemini-2.5-flash"]'
          );
        } catch (e) {
          console.warn(
            "AVAILABLE_AI_MODELS の解析に失敗、デフォルト値を使用:",
            e
          );
          return ["google/gemini-2.5-flash"];
        }
      })(),
    },
  },
});
