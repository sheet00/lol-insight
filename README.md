# lol-insight

League of Legends プレイヤー情報・試合分析アプリケーション

## 📋 プロジェクト概要

Riot Games League of Legends API を活用して、プレイヤーの情報・対戦情報を取得し、試合前に生成 AI でアドバイスを作成する Web アプリケーションです。

### 🎯 主な機能

- **サモナー検索**: Riot ID からプレイヤー情報を検索
- **リアルタイム試合分析**: 進行中の試合情報とマッチアップ分析
- **過去試合分析**: 最新の試合結果とプレイヤーパフォーマンス
- **ランク情報表示**: ソロランクの詳細情報表示

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
├── pages/
│   └── index.vue             # メインページ
├── server/
│   ├── api/                  # サーバーAPI
│   │   ├── summoner/
│   │   │   └── search.post.ts    # サモナー検索API
│   │   └── match/
│   │       ├── live.post.ts      # 進行中試合API
│   │       └── latest.post.ts    # 最新試合API
│   └── utils/
│       └── RiotApiManager.ts     # Riot API管理クラス
├── types/
│   └── index.ts              # TypeScript型定義
├── nuxt.config.ts            # Nuxt設定
└── package.json              # 依存関係
```

### API エンドポイント

- `POST /api/summoner/search` - サモナー情報検索
- `POST /api/match/live` - 進行中試合情報取得
- `POST /api/match/latest` - 最新試合情報取得

## 🚀 セットアップ & 起動

### 1. 環境変数設定

`.env`ファイルを作成し、Riot API Key を設定:

```bash
RIOT_API_KEY=your_riot_api_key_here
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

## 🎮 使用方法

1. **プレイヤー検索**: ゲーム名とタグライン（例: shaat00#JP1）を入力
2. **自動分析**:
   - 進行中の試合がある場合 → リアルタイム分析を表示
   - 進行中の試合がない場合 → 最新試合の結果を表示
3. **詳細情報**: チーム構成、ランク情報、KDA などを確認

## 🔧 開発仕様

### Rate Limit 管理

- `RiotApiManager`クラスで API 呼び出しを管理
- 1 秒間最大 19 リクエスト、2 分間最大 95 リクエスト制限
- キューシステムによる順次実行

### コーディング規約

- CSS 外部ファイル使用（`assets/styles/` 配下）
- TypeScript strict mode
- Vue Composition API

## 🔗 参考リンク

- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot Games API Documentation](https://developer.riotgames.com/docs/lol)
- [Nuxt.js Documentation](https://nuxt.com/docs)
