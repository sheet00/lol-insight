import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type AdvicePayload = {
  gameId: string;
  gameInfo: { gameMode: string; queueId: number };
  myChampion: {
    championName: string;
    puuid: string;
    rank?: any;
    summonerLevel?: number;
    teamId?: number;
  };
  myTeam: Array<{
    championName: string;
    rank?: any;
    summonerLevel?: number;
    role?: string;
    teamId?: number;
    isMyself?: boolean;
  }>;
  enemyTeam: Array<{
    championName: string;
    rank?: any;
    summonerLevel?: number;
    role?: string;
    teamId?: number;
  }>;
  model?: string; // 使用するAIモデルを指定（オプション）
};

export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    const config = useRuntimeConfig() as any;
    const or = config?.openRouter || {};

    if (!or?.apiKey) throw new Error("OPENROUTER_API_KEY が未設定です");
    if (!or?.model) throw new Error("OPENROUTER_MODEL が未設定です");

    this.client = new OpenAI({
      baseURL: or.baseURL || "https://openrouter.ai/api/v1",
      apiKey: or.apiKey,
      defaultHeaders: {
        "HTTP-Referer":
          or.httpReferer || "https://github.com/your-org/lol-insight",
        "X-Title": or.xTitle || "lol-insight",
      },
    });
    this.defaultModel = or.model;
  }

  async generateAdvice(payload: AdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPrompts();
    const inputJson = this.buildPromptPayload(payload);
    
    // payloadで指定されたモデルを使用、なければデフォルトモデル
    const modelToUse = payload.model || this.defaultModel;

    try {
      const my = Array.isArray(payload.myTeam)
        ? payload.myTeam.map((p) => p.championName)
        : [];
      const en = Array.isArray(payload.enemyTeam)
        ? payload.enemyTeam.map((p) => p.championName)
        : [];
      console.log("[AI] Request summary", {
        model: modelToUse,
        gameId: payload.gameId,
        gameMode: payload.gameInfo?.gameMode,
        queueId: payload.gameInfo?.queueId,
        myChampion: payload.myChampion?.championName,
        myTeam: my,
        enemyTeam: en,
      });
    } catch {
      // noop
    }

    // 1回目: 通常生成
    const first = await this.client.chat.completions.create({
      model: modelToUse,
      temperature: 0.4,
      max_tokens: 65536,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lol_advice_structured",
          strict: true,
          schema: {
            type: "object",
            properties: {
              対面チャンピオン分析: {
                type: "object",
                description: "自分のレーンの直接対面するチャンピオンのみに関する分析。BOT=ADC+SUP、MID/TOP/JG=各1人のみ。他のレーンのチャンピオンは含めない。",
                properties: {
                  警戒ポイント: {
                    type: "string",
                    description: "対面チャンピオン（自分と同じレーン）の危険なタイミング、スキル、行動パターンを丁寧な長文で説明。具体的なレベル、時間帯、状況を含める。箇条書きは不可。他のレーンのチャンピオンは言及しない。"
                  },
                  対策方法: {
                    type: "string",
                    description: "対面チャンピオン（自分と同じレーン）に対する具体的な対策、ポジショニング、スキルの使い方を丁寧な長文で説明。実行可能なアクションを含める。箇条書きは不可。他のレーンのチャンピオンは言及しない。"
                  }
                },
                required: ["警戒ポイント", "対策方法"],
                additionalProperties: false
              },
              自分の戦略: {
                type: "object",
                description: "自分のプレイに関する戦略",
                properties: {
                  レーン戦: {
                    type: "string",
                    description: "レーン戦での具体的な立ち回り、ファーム方法、ハラスのタイミング、ガンク対応を丁寧な長文で説明。箇条書きは不可。"
                  },
                  集団戦: {
                    type: "string", 
                    description: "集団戦での役割、ポジション、スキルの使用順序、狙うべきターゲットを丁寧な長文で説明。箇条書きは不可。"
                  },
                  装備戦略: {
                    type: "string",
                    description: "相手チーム構成に合わせた装備選択、アイテムの優先順位、状況別の装備変更を丁寧な長文で説明。具体的なアイテム名を含める。箇条書きは不可。"
                  }
                },
                required: ["レーン戦", "集団戦", "装備戦略"],
                additionalProperties: false
              }
            },
            required: ["対面チャンピオン分析", "自分の戦略"],
            additionalProperties: false
          }
        }
      } as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` },
      ],
    });
    const finish1 = first.choices?.[0]?.finish_reason;
    const text1 = first.choices?.[0]?.message?.content || "";
    console.log("[AI] Response meta", {
      finish_reason: finish1,
      model: first.model,
      usage: (first as any).usage || undefined,
    });
    console.log("[AI] Response content", text1);
    
    // デバッグ用: レスポンスをtmpフォルダに保存
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ai-response-${timestamp}.json`;
      const tmpDir = path.resolve(process.cwd(), 'tmp');
      
      // tmpディレクトリが存在しない場合は作成
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const filepath = path.join(tmpDir, filename);
      fs.writeFileSync(filepath, text1, 'utf-8');
      console.log(`[AI] Response saved to: ${filepath}`);
    } catch (saveError) {
      console.log("[AI] Failed to save response:", saveError);
    }
    
    try {
      return JSON.parse(text1);
    } catch (e1: any) {
      const snippet1 = text1.slice(0, 500);
      const msg1 = String(e1?.message || e1);
      
      
      throw new Error(`JSON parse failed: ${msg1}. finish_reason=${finish1}. snippet=${snippet1}`);
    }
  }

  private buildPromptPayload(payload: AdvicePayload) {
    return JSON.stringify({
      // 自分のチャンピオンを明確に指定
      myChampionName: payload.myChampion?.championName,
      // ChampionID ではなく ChampionName を含む入力を渡す
      ...payload,
      schema: {
        対面チャンピオン分析: {
          警戒ポイント: "string (対面チャンピオンの危険なタイミング、スキル、行動パターンを具体的に説明)",
          対策方法: "string (対面チャンピオンに対する具体的な対策、ポジショニング、スキルの使い方を説明)"
        },
        自分の戦略: {
          レーン戦: "string (レーン戦での具体的な立ち回り、ファーム方法、ハラスのタイミング、ガンク対応を説明)",
          集団戦: "string (集団戦での役割、ポジション、スキルの使用順序、狙うべきターゲットを説明)",
          装備戦略: "string (相手チーム構成に合わせた装備選択、アイテムの優先順位、状況別の装備変更を説明)"
        }
      },
    });
  }

  private async loadPrompts() {
    // 常にMDを読み込む（ホットリロード用途）
    const cwd = process.cwd();
    const systemPath = resolve(cwd, "server/prompts/system.md");
    const instructionPath = resolve(cwd, "server/prompts/pre-match-instruction.md");
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, "utf-8"),
      readFile(instructionPath, "utf-8"),
    ]);
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() };
  }




}
