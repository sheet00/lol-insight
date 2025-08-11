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
          name: "lol_advice",
          strict: true,
          schema: {
            type: "object",
            properties: {
              マッチアップ分析: {
                type: "array",
                description: "敵チーム5人全員に対するマッチアップ分析",
                items: {
                  type: "object",
                  properties: {
                    自分のチャンピオン: {
                      type: "string",
                      description: "INPUT内のmyChampion.championNameと同じ値"
                    },
                    対戦相手: {
                      type: "string", 
                      description: "敵チャンピオン名"
                    },
                    相手ロール: {
                      type: "string",
                      enum: ["Top", "Jungle", "Mid", "ADC", "Support"],
                      description: "敵のロール"
                    },
                    強み: {
                      type: "array",
                      description: "相手の強い部分",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 3
                    },
                    弱み: {
                      type: "array", 
                      description: "相手の弱い部分",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 3
                    },
                    戦略: {
                      type: "array",
                      description: "自分がどう戦うべきか",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 4
                    },
                    注意点: {
                      type: "array",
                      description: "気をつけるべきポイント",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 3
                    }
                  },
                  required: ["自分のチャンピオン", "対戦相手", "相手ロール", "強み", "弱み", "戦略", "注意点"],
                  additionalProperties: false
                }
              },
              推奨装備: {
                type: "object",
                description: "装備戦略とアイテム推奨",
                properties: {
                  序盤装備: {
                    type: "array",
                    description: "序盤のアイテム",
                    items: { type: "string" }
                  },
                  コアアイテム: {
                    type: "array", 
                    description: "コアアイテム3つ",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  状況対応装備: {
                    type: "array",
                    description: "状況に応じた装備選択",
                    items: {
                      type: "object",
                      properties: {
                        条件: {
                          type: "string",
                          description: "具体的で価値ある状況"
                        },
                        アイテム: {
                          type: "string",
                          description: "推奨アイテム名"
                        },
                        理由: {
                          type: "string",
                          description: "効果的な理由と使い方"
                        }
                      },
                      required: ["条件", "アイテム", "理由"],
                      additionalProperties: false
                    }
                  },
                  装備優先度: {
                    type: "array",
                    description: "装備の優先順序",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 4
                  }
                },
                required: ["序盤装備", "コアアイテム", "状況対応装備", "装備優先度"],
                additionalProperties: false
              },
              相手チーム分析: {
                type: "object",
                description: "相手チーム全体の戦略的特徴",
                properties: {
                  チーム全体の強み: {
                    type: "array",
                    description: "相手チームの強い部分",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 4
                  },
                  チーム全体の弱み: {
                    type: "array",
                    description: "相手チームの弱い部分", 
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 4
                  },
                  狙い目ターゲット: {
                    type: "array",
                    description: "優先的に狙うべき敵",
                    items: {
                      type: "object",
                      properties: {
                        チャンピオン: {
                          type: "string",
                          description: "狙いやすい敵"
                        },
                        理由: {
                          type: "string", 
                          description: "なぜ狙いやすいか"
                        },
                        攻略法: {
                          type: "string",
                          description: "どう倒すか"
                        }
                      },
                      required: ["チャンピオン", "理由", "攻略法"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["チーム全体の強み", "チーム全体の弱み", "狙い目ターゲット"],
                additionalProperties: false
              },
              自チャンピオン戦略: {
                type: "object",
                description: "自分のチャンピオン固有の戦略",
                properties: {
                  チーム内での役割: {
                    type: "array",
                    description: "自分のポジションと責任",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 3
                  },
                  時間帯別行動: {
                    type: "object",
                    description: "ゲーム進行に応じた行動",
                    properties: {
                      序盤: {
                        type: "array",
                        description: "序盤の行動指針",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 3
                      },
                      中盤: {
                        type: "array", 
                        description: "中盤の行動指針",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 3
                      },
                      終盤: {
                        type: "array",
                        description: "終盤の行動指針", 
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 3
                      }
                    },
                    required: ["序盤", "中盤", "終盤"],
                    additionalProperties: false
                  },
                  チームファイト戦略: {
                    type: "array",
                    description: "集団戦での動き",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 3
                  },
                  ゲーム展開対応: {
                    type: "object",
                    description: "ゲーム状況別の対応",
                    properties: {
                      有利時: {
                        type: "array",
                        description: "リード時の行動",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 2
                      },
                      不利時: {
                        type: "array",
                        description: "劣勢時の立ち回り",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 2
                      },
                      接戦時: {
                        type: "array",
                        description: "均衡時の判断基準",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 2
                      }
                    },
                    required: ["有利時", "不利時", "接戦時"],
                    additionalProperties: false
                  }
                },
                required: ["チーム内での役割", "時間帯別行動", "チームファイト戦略", "ゲーム展開対応"],
                additionalProperties: false
              }
            },
            required: ["マッチアップ分析", "推奨装備", "相手チーム分析", "自チャンピオン戦略"],
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
        マッチアップ分析: [
          {
            自分のチャンピオン: "string (必ず myChampionName と同じ値を使用)",
            対戦相手: "string",
            相手ロール: "string",
            強み: ["string"],
            弱み: ["string"],
            戦略: ["string"],
            注意点: ["string"],
          },
        ],
        推奨装備: {
          序盤装備: ["string"],
          コアアイテム: ["string"],
          状況対応装備: [
            {
              条件: "string",
              アイテム: "string",
            },
          ],
          装備優先度: ["string"],
        },
        相手チーム分析: {
          チーム全体の強み: ["string"],
          チーム全体の弱み: ["string"],
          狙い目ターゲット: [
            {
              チャンピオン: "string",
              理由: "string",
              攻略法: "string",
            },
          ],
        },
        自チャンピオン戦略: {
          チーム内での役割: ["string"],
          時間帯別行動: {
            序盤: ["string"],
            中盤: ["string"],
            終盤: ["string"],
          },
          チームファイト戦略: ["string"],
          ゲーム展開対応: {
            有利時: ["string"],
            不利時: ["string"],
            接戦時: ["string"],
          },
        },
      },
    });
  }

  private async loadPrompts() {
    // 常にMDを読み込む（ホットリロード用途）
    const cwd = process.cwd();
    const systemPath = resolve(cwd, "server/prompts/system.md");
    const instructionPath = resolve(cwd, "server/prompts/instruction.md");
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, "utf-8"),
      readFile(instructionPath, "utf-8"),
    ]);
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() };
  }




}
