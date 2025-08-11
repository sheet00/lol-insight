# 実装案: 進行中試合に対する生成AIアドバイス機能

## 目的
- 進行中の試合情報をもとに、生成AIが日本語で立ち回りアドバイスを返す機能を追加する。
- 自分チームと相手チームの情報を安全にプロンプトへ渡し、UI に構造化して表示する。

## 全体アーキテクチャ
- フロントエンドはまず `POST /api/match/live` で進行中試合データを取得する。
- 必要最小限のデータを `POST /api/advice/generate` に送信する。
- サーバーは OpenRouter 経由でモデルを呼び出し、JSON のアドバイスを返却する。
- UI は返却 JSON を整形してカード表示する。

## API 仕様案

### 既存エンドポイント
- `POST /api/match/live` で `LiveMatchDetail` を取得する。

### 新規エンドポイント
- `POST /api/advice/generate`
  - Request 例:
    ```json
    {
      "gameId": "1234567890",
      "gameInfo": { "gameMode": "CLASSIC", "queueId": 420 },
      "myTeam": [
        { "championName": "Lee Sin", "rank": {"tier": "EMERALD", "rank": "II"}, "summonerLevel": 324, "role": "JUNGLE" }
      ],
      "enemyTeam": [
        { "championName": "Zed", "rank": {"tier": "DIAMOND", "rank": "IV"}, "summonerLevel": 401, "role": "MID" }
      ]
    }
    ```
  - Response 例:
    ```json
    {
      "advice": {
        "early_game_focus": "敵JGの初動は赤スタート濃厚なので逆側で主導権を取ろう。",
        "mid_game_calls": "ドラゴン2本目の前にリバー視界を先確保しよう。",
        "objective_priority": ["ドラゴン", "ヘラルド", "外側タワー"],
        "lane_matchups": [
          { "lane": "MID", "tip": "ゼドの6以降は影の位置を意識し、WのCD中は仕掛けを避ける。" }
        ],
        "power_spikes": ["味方JG Lv6", "MIDのミシック完成"],
        "risk_points": ["サイド視界不足時のピックオフ"]
      }
    }
    ```

- 方針メモ:
  - PUUID などの個人識別は送らず、試合戦略に必要な最小データのみ送る。
  - 生成出力は JSON 固定にしてパース安定性を確保する。

## サーバー実装方針

### 環境変数（モデルはENVで指定）
- `.env` に以下を追加する（モデルはENVで指定する）：
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`（例: `google/gemini-2.5-flash`）
  - `OPENROUTER_BASE_URL`（省略可。既定: `https://openrouter.ai/api/v1`）
  - `OPENROUTER_HTTP_REFERER`（省略可。ランキング用途のサイトURL）
  - `OPENROUTER_X_TITLE`（省略可。ランキング用途のサイト名）
- `nuxt.config.ts` の `runtimeConfig` に以下を追加する。
  ```ts
  // nuxt.config.ts
  export default defineNuxtConfig({
    runtimeConfig: {
      openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL,
        baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        httpReferer: process.env.OPENROUTER_HTTP_REFERER,
        xTitle: process.env.OPENROUTER_X_TITLE
      }
    }
  })
  ```

### OpenRouter クライアント薄ラッパ
- 追加: `src/server/utils/OpenRouterClient.ts`
- OpenAI SDK を利用し、OpenRouter をベースURLに設定する。
- system/instruction はMDで管理し、実行時に毎回読み込む。

```ts
// src/server/utils/OpenRouterClient.ts
import OpenAI from "openai"
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export type AdvicePayload = {
  gameId: string
  gameInfo: { gameMode: string; queueId: number }
  myTeam: Array<{ championName: string; rank?: any; summonerLevel?: number; role?: string }>
  enemyTeam: Array<{ championName: string; rank?: any; summonerLevel?: number; role?: string }>
}

export class OpenRouterClient {
  private client: OpenAI
  private model: string
  private debug: boolean

  constructor() {
    const config = useRuntimeConfig()
    const or = config.openRouter || {}

    if (!or?.apiKey) throw new Error("OPENROUTER_API_KEY が未設定です")
    if (!or?.model) throw new Error("OPENROUTER_MODEL が未設定です")

    this.client = new OpenAI({
      baseURL: or.baseURL || "https://openrouter.ai/api/v1",
      apiKey: or.apiKey,
      defaultHeaders: {
        "HTTP-Referer": or.httpReferer || "https://github.com/your-org/lol-insight",
        "X-Title": or.xTitle || "lol-insight"
      }
    })
    this.model = or.model
  }

  async generateAdvice(payload: AdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPrompts()
    const inputJson = this.buildPromptPayload(payload)
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` }
      ]
    })
    return JSON.parse(completion.choices[0].message.content || "{}")
  }

  private buildPromptPayload(payload: AdvicePayload) {
    return JSON.stringify({
      input: payload,
      schema: {
        advice: {
          early_game_focus: "string",
          mid_game_calls: "string",
          objective_priority: ["string"],
          lane_matchups: [{ lane: "string", tip: "string" }],
          power_spikes: ["string"],
          risk_points: ["string"]
        }
      }
    })
  }

  private async loadPrompts() {
    const cwd = process.cwd()
    const systemPath = resolve(cwd, 'server/prompts/system.md')
    const instructionPath = resolve(cwd, 'server/prompts/instruction.md')
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, 'utf-8'),
      readFile(instructionPath, 'utf-8')
    ])
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() }
  }
}
```

### 参考: OpenAI SDK 初期化例（OpenRouter + ENV）
```ts
import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
    'X-Title': process.env.OPENROUTER_X_TITLE || ''
  }
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL!,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg'
            }
          }
        ]
      }
    ]
  })

  console.log(completion.choices[0].message)
}

main()
```

### API ハンドラ
- 追加: `src/server/api/advice/generate.post.ts`

```ts
import { defineEventHandler, readBody, createError } from "h3"
import { OpenRouterClient } from "~/server/utils/OpenRouterClient"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, gameInfo, myTeam, enemyTeam } = body || {}

  if (!gameId || !gameInfo || !myTeam || !enemyTeam) {
    throw createError({ statusCode: 400, statusMessage: "必要なフィールドが不足しています" })
  }

  try {
    // APIキー・モデルは runtimeConfig/ENV から取得（OpenRouterClient 内で検証）
    const client = new OpenRouterClient()
    const json = await client.generateAdvice({ gameId, gameInfo, myTeam, enemyTeam })
    return json
  } catch (e: any) {
    if (e?.status === 429) {
      throw createError({ statusCode: 429, statusMessage: "レート制限に達しました。時間をおいて再試行してください" })
    }
    throw createError({ statusCode: 500, statusMessage: "AIアドバイス生成でエラーが発生しました" })
  }
})
```

## フロント実装方針

### 画面フロー
- サモナー検索 → 進行中試合取得 → 自動でアドバイス生成を実行。
- 画面上の「アドバイス再生成」ボタンで任意タイミングで再生成可能。
- 生成完了後、カード形式でアドバイスを表示。

### UI コンポーネント
- 追加: `src/components/AdvicePanel.vue`
- CSS 分離: `src/assets/styles/components/AdvicePanel.css`

```vue
<!-- src/components/AdvicePanel.vue -->
<script setup lang="ts">
import "@/assets/styles/components/AdvicePanel.css"

defineProps<{ advice: any, loading?: boolean }>()
</script>

<template>
  <section class="advice-panel">
    <div v-if="loading" class="advice-skel">アドバイス生成中…</div>
    <template v-else>
      <h3>序盤</h3>
      <p>{{ advice.early_game_focus }}</p>
      <h3>中盤</h3>
      <p>{{ advice.mid_game_calls }}</p>
      <h3>オブジェクト優先度</h3>
      <ul><li v-for="o in advice.objective_priority" :key="o">{{ o }}</li></ul>
      <h3>レーン対面</h3>
      <ul><li v-for="m in advice.lane_matchups" :key="m.lane">{{ m.lane }}: {{ m.tip }}</li></ul>
      <h3>パワースパイク</h3>
      <ul><li v-for="p in advice.power_spikes" :key="p">{{ p }}</li></ul>
      <h3>リスク</h3>
      <ul><li v-for="r in advice.risk_points" :key="r">{{ r }}</li></ul>
    </template>
  </section>
</template>
```

```css
/* src/assets/styles/components/AdvicePanel.css */
.advice-panel { @apply bg-white/5 rounded-xl p-4 space-y-3; }
.advice-skel { @apply animate-pulse text-gray-400; }
.advice-panel h3 { @apply font-semibold mt-2; }
.advice-panel ul { @apply list-disc pl-5; }
```

### 自動生成/再生成の実装メモ
- マウント時、または `live.gameId` が変わった時に自動生成を走らせる。
- ボタン押下時は進行中リクエストを中断してから再生成（`AbortController`）。
- 多重実行を避けるため `isGenerating` フラグでボタンを無効化。
- 同一 `gameId` の連打はキャッシュで抑制（必要に応じて実装）。

### 呼び出し例（pages/index.vue）
```ts
// 1) 進行中試合の取得
const live = await $fetch("/api/match/live", { method: "POST", body: { puuid } })

// 2) アドバイス生成用の状態
const advice = ref<any | null>(null)
const isGenerating = ref(false)
let controller: AbortController | null = null

// 3) 生成処理（自動/再生成共通）
async function generateAdvice() {
  if (controller) controller.abort()
  controller = new AbortController()
  isGenerating.value = true
  try {
    // IDから名称へ変換（例: champion.json 利用）
    const toName = (id: number) => getChampionNameById(id) // 実装はクライアント側

    const body = {
      gameId: live.gameId,
      gameInfo: live.gameInfo,
      myTeam: live.myTeam.map(({ championId, rank, summonerLevel, teamId, role }: any) => ({ championName: toName(championId), rank, summonerLevel, teamId, role })),
      enemyTeam: live.enemyTeam.map(({ championId, rank, summonerLevel, teamId, role }: any) => ({ championName: toName(championId), rank, summonerLevel, teamId, role }))
    }
    const res = await $fetch("/api/advice/generate", { method: "POST", body, signal: controller.signal })
    advice.value = res.advice || res
  } finally {
    isGenerating.value = false
  }
}

// 4) 自動生成（gameId 変化時にも再走）
watch(() => live?.gameId, async (id) => { if (id) await generateAdvice() }, { immediate: true })

// 5) 再生成ボタンのハンドラ
function onRegenerate() {
  if (!isGenerating.value) generateAdvice()
}

// 6) テンプレート例
// <button :disabled="isGenerating" @click="onRegenerate" class="btn-primary">アドバイス再生成</button>
// <AdvicePanel :advice="advice" :loading="isGenerating" />
```

## プロンプト設計メモ
- 出力は JSON 固定でフィールド名をガイドする。
- `gameInfo` を渡してキュー種別による助言の重みを調整できるようにする。
- LLM 入力は ChampionID ではなく ChampionName を渡す（理解しやすさと汎用性のため）。

## モデル選択
- モデルは ENV (`OPENROUTER_MODEL`) で指定する。
- 例: `google/gemini-2.5-flash`（画像要素を含むプロンプトにも対応）。
- チューニング方針は環境ごとに差し替え可能（速度/コスト/精度のバランス）。

## エラーハンドリング
- 429 はリトライ案内とバックオフ。
- 5xx は「生成に失敗」トーストを表示。
- JSON パース失敗時は再試行または簡易リカバリで不正出力を破棄する。

## セキュリティと運用
- API キーはサーバーのみで保持しクライアントへ露出しない。
- ログにキーや個人識別情報を出力しない。
- `gameId` をキーに短期キャッシュして連打を緩和する。
- 温度とトークン上限でコストを管理する。

## ステップ一覧
1. `nuxt.config.ts` に `runtimeConfig.openRouter`（apiKey/model/baseURL/headers）を追加。
2. `server/utils/OpenRouterClient.ts` を実装（ENVからモデル・キー取得）。
3. `server/api/advice/generate.post.ts` を作成（Clientを呼び出し）。
4. 必要なら型を `types/index.ts` に追加。
5. `AdvicePanel.vue` と CSS を追加。
6. 画面へ呼び出しと表示を組み込み。
7. レート制限とエラートーストを整備。

## 将来拡張
- ストリーミング出力で段階表示に対応する。
- プレマッチでも同機能を使えるようにエンドポイントを汎用化する。
- ユーザーフィードバックを収集しプロンプトを継続改善する。
### プロンプト管理（MD）
- 追加: `src/server/prompts/system.md`（systemメッセージ）
- 追加: `src/server/prompts/instruction.md`（instructionメッセージ）
- 本番/開発ともに毎回FSから読み込むため、MD更新が即時反映される。

サンプル:
```md
// system.md（一部）
あなたはLeague of Legendsの試合コーチです。日本語で簡潔かつ実用的なアドバイスを出します。
- 出力はJSONのみ
```

```md
// instruction.md（一部）
次の入力（INPUT）を基に、定義スキーマでJSONを返して。
```
