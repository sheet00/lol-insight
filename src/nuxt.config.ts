export default defineNuxtConfig({
  nitro: {
    experimental: {
      wasm: true,
    },
    preset: 'cloudflare',
    // ルートルール警告を抑制
    routeRules: {
      "/api/**": {
        headers: { "cache-control": "no-cache" },
        cors: true,
      },
      "/_nuxt/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    },
    // 静的ファイルのキャッシュ設定
    publicAssets: [
      {
        dir: '_nuxt',
        maxAge: 31536000
      }
    ]
  },
  devtools: { enabled: true },
  compatibilityDate: "2025-08-11",

  // SSR設定を明示的に指定
  ssr: true,

  // CSS フレームワーク
  css: ["~/assets/styles/main.css"],

  // モジュール
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "nuxt-auth-utils"],

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
