# lol-teacher

League of Legends プレイヤー情報・試合分析アプリケーション

## 📋 プロジェクト概要

Riot Games League of Legends API を活用して、プレイヤーの情報・対戦情報を取得し、試合前に生成 AI でアドバイスを作成する Web アプリケーションです。

### 🎯 主な機能

- **サモナー検索**: Riot ID からプレイヤー情報を検索
- **リアルタイム試合分析**: 進行中の試合情報とマッチアップ分析
- **過去試合分析**: 最新の試合結果とプレイヤーパフォーマンス
- **ランク情報表示**: ソロランクの詳細情報表示
- **AI アドバイス生成**: 試合前・試合後の状況に応じた AI による戦略アドバイス
- **タイムライン分析**: 試合の重要な出来事の時系列分析
- **モデル選択**: 複数の AI モデルから選択可能な柔軟な分析

## 🛠 技術スタック

### フロントエンド

- **Nuxt.js 4.0.3** - Vue.js ベースのフルスタックフレームワーク
- **Vue 3** - Composition API
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストの CSS フレームワーク
- **Pinia** - Vue 用状態管理ライブラリ

### バックエンド

- **Nuxt Server API** - サーバーサイド API
- **Riot Games API** - League of Legends データソース
  - Account API V1
  - Summoner API V4
  - League API V4
  - Match API V5
  - Spectator API V5
  - Challenges API V1
- **OpenRouter API** - AI アドバイス生成用
  - 複数の AI モデル対応（Gemini, GPT 等）
  - 構造化された JSON レスポンス

### 開発環境

- **Docker** - コンテナ化された開発環境
- **Node.js (slim)** - ランタイム環境

## 🏗 アーキテクチャ

### ディレクトリ構造

```
src/
├── app.vue                    # ルートコンポーネント
├── assets/styles/             # スタイルシート
├── components/                # Vue コンポーネント
├── composables/              # Vue Composables
├── data/                      # 静的データファイル
├── pages/
│   └── index.vue             # メインページ
├── server/
│   ├── api/                  # サーバーAPI
│   │   ├── summoner/
│   │   │   └── search.post.ts    # サモナー検索API
│   │   ├── match/
│   │   │   ├── live.post.ts      # 進行中試合API
│   │   │   ├── latest.post.ts    # 最新試合API
│   │   │   └── timeline.post.ts  # タイムラインAPI
│   │   └── advice/
│   │       ├── pre-match.post.ts  # 試合前AIアドバイスAPI
│   │       └── post-match.post.ts # 試合後AIアドバイスAPI
│   ├── prompts/               # AIプロンプトテンプレート
│   │   ├── system.md          # システムプロンプト
│   │   ├── pre-match-instruction.md  # 試合前指示
│   │   └── post-match-instruction.md # 試合後指示
│   └── utils/
│       ├── RiotApiManager.ts     # Riot API管理クラス
│       └── OpenRouterClient.ts   # AI APIクライアント
├── types/
│   └── index.ts              # TypeScript型定義
├── utils/                    # ユーティリティ関数
├── nuxt.config.ts            # Nuxt設定
└── package.json              # 依存関係
```

## 🚀 セットアップ & 起動

### 1. 環境変数設定

`.env`ファイルを作成し、必要な API Key を設定:

```bash
# Riot Games API Key (必須)
RIOT_API_KEY=your_riot_api_key_here

# OpenRouter API Key (AIアドバイス機能用、任意)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 利用可能なAIモデル一覧 (JSON形式)
AVAILABLE_AI_MODELS=["google/gemini-2.5-flash","openai/gpt-4o-mini","anthropic/claude-3-haiku"]
```

### 2. Docker 環境での起動

```bash
# コンテナ起動
docker-compose up -d

# アプリケーション起動確認
http://localhost:3000
```

### 3. ローカル環境での起動

```bash
cd src
npm install
npm run dev
```

## ☁️ Cloudflare Workers デプロイ

### 前提条件

- Wrangler CLI がインストールされていること
- Cloudflare アカウントでログイン済みであること

### デプロイ手順

```bash
cd src

# ビルド & デプロイ（一括実行）
npm run deploy

# または手動で実行
npm run build; npx wrangler deploy
```

### 環境変数の設定

Cloudflare Workers 環境では、環境変数をシークレットとして設定：

```bash
# 必須（アプリ機能）
npx wrangler secret put RIOT_API_KEY

# 必須（セッション管理｜nuxt-auth-utils）
# 32文字以上のランダムな文字列を推奨。未設定だと認証が動作しません
npx wrangler secret put NUXT_SESSION_PASSWORD

# 認証ゲート（任意）
# 設定するとログイン画面でこの値との一致チェックを行います
npx wrangler secret put APP_PASSWORD

# AI機能用（任意）
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put OPENROUTER_MODEL
npx wrangler secret put AVAILABLE_AI_MODELS
```

補足

- 本プロジェクトは Cloudflare ランタイムの ENV を優先して参照します（`APP_PASSWORD` など）
- シークレットを更新したら `npx wrangler deploy` で再デプロイしてください
- `NUXT_SESSION_PASSWORD` はサーバー側セッション暗号化に必須です（公開しないでください）

### 設定ファイル

- `wrangler.jsonc` - Cloudflare Workers 設定
- `nuxt.config.ts` - cloudflare-module プリセット対応

## 🎮 使用方法

1. **プレイヤー検索**: ゲーム名とタグライン（例: shaat00#JP1）を入力
2. **自動分析**:
   - 進行中の試合がある場合 → リアルタイム分析と AI アドバイスを表示
   - 進行中の試合がない場合 → 最新試合の結果と試合後分析を表示
3. **詳細情報**: チーム構成、ランク情報、KDA、ダメージ統計などを確認
4. **AI アドバイス**:
   - 試合前に相手チーム構成に基づいた戦略アドバイスを生成
   - 試合後にパフォーマンス分析と改善点を提案
5. **AI モデル選択**: 右上のドロップダウンから好みの AI モデルを選択可能

## 🔧 開発仕様

### Rate Limit 管理

- `RiotApiManager`クラスで API 呼び出しを管理
- 1 秒間最大 19 リクエスト、2 分間最大 95 リクエスト制限
- キューシステムによる順次実行

### AI アドバイス生成

- `OpenRouterClient`クラスで AI API 呼び出しを管理
- 複数の AI モデルに対応（Gemini, GPT 等）
- 構造化された JSON レスポンス形式
- プロンプトテンプレートによる一貫性のある出力

### 環境変数取得ルール（Cloudflare対応）

- **サーバーサイドAPI**: `process.env`から直接取得（`useRuntimeConfig`禁止）
- **フロントエンドUI**: `NUXT_PUBLIC_*`変数のみ`useRuntimeConfig`使用可能
- **理由**: Cloudflare Workers環境で`useRuntimeConfig`が正常に動作しないため
- **デフォルト値設定**: 設定漏れ検知のため、デフォルト値設定を禁止

### コーディング規約

- CSS 外部ファイル使用（`assets/styles/` 配下）
- TypeScript strict mode
- Vue Composition API

## 🔄 API エンドポイント

### サモナー関連

- `POST /api/summoner/search` - サモナー情報検索

### 試合情報関連

- `POST /api/match/live` - 進行中試合情報取得
- `POST /api/match/latest` - 最新試合情報取得
- `POST /api/match/timeline` - 試合タイムライン取得

### AI アドバイス関連

- `POST /api/advice/pre-match` - 試合前 AI アドバイス生成
- `POST /api/advice/post-match` - 試合後 AI アドバイス生成

## � 参考リンク

- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot Games API Documentation](https://developer.riotgames.com/docs/lol)
- [Nuxt.js Documentation](https://nuxt.com/docs)

https://ddragon.leagueoflegends.com/cdn/15.15.1/data/ja_JP/champion.json
