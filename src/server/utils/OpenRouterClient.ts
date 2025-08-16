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

export type PostMatchAdvicePayload = {
  matchId: string;
  matchData: {
    gameInfo: any;
    myTeam: any[];
    enemyTeam: any[];
    myParticipant: any;
    teamStats: any;
    analysisSummary: any;
    timelineEvents: any[];
  };
  model?: string;
};

export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    const config = useRuntimeConfig() as any;
    const or = config?.openRouter || {};

    if (!or?.apiKey) throw new Error("OPENROUTER_API_KEY が未設定です");

    // デフォルトモデルの決定：ENVに設定があればそれを使用、なければAVAILABLE_AI_MODELSの先頭を使用
    let defaultModel = or?.model;
    if (!defaultModel) {
      const availableModels = config?.public?.availableAiModels || [];
      if (availableModels.length > 0) {
        defaultModel = availableModels[0];
      } else {
        throw new Error("デフォルトモデルが設定されていません（OPENROUTER_MODEL または AVAILABLE_AI_MODELS が必要です）");
      }
    }

    this.client = new OpenAI({
      baseURL: or.baseURL || "https://openrouter.ai/api/v1",
      apiKey: or.apiKey,
      defaultHeaders: {
        "HTTP-Referer":
          or.httpReferer || "https://github.com/your-org/lol-insight",
        "X-Title": or.xTitle || "lol-insight",
      },
    });
    this.defaultModel = defaultModel;
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

  async generatePostMatchAdvice(payload: PostMatchAdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPostMatchPrompts();
    const inputJson = this.buildPostMatchPromptPayload(payload);
    
    // payloadで指定されたモデルを使用、なければデフォルトモデル
    const modelToUse = payload.model || this.defaultModel;

    try {
      console.log("[AI] Post-match request summary", {
        model: modelToUse,
        matchId: payload.matchId,
        gameMode: payload.matchData?.gameInfo?.gameMode,
        queueId: payload.matchData?.gameInfo?.queueId,
        gameDuration: payload.matchData?.gameInfo?.gameDuration,
        myChampion: payload.matchData?.myParticipant?.championName,
        result: payload.matchData?.myParticipant?.win ? 'WIN' : 'LOSE',
        timelineEventsCount: payload.matchData?.timelineEvents?.length || 0,
      });
    } catch {
      // noop
    }

    // 試合後分析用のレスポンス生成
    const completion = await this.client.chat.completions.create({
      model: modelToUse,
      temperature: 0.6,
      max_tokens: 65536,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lol_post_match_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              "ゲーム全体の総評": {
                type: "object",
                properties: {
                  "試合の流れ": {
                    type: "string",
                    description: "ゲーム全体の展開と結果に至るまでの流れを時系列で分析"
                  },
                  "勝敗要因": {
                    type: "string", 
                    description: "勝利または敗北の主要な要因とその背景"
                  },
                  "チーム貢献度": {
                    type: "string",
                    description: "チーム全体への貢献と役割の評価"
                  }
                },
                required: ["試合の流れ", "勝敗要因", "チーム貢献度"],
                additionalProperties: false
              },
              "良かった点・悪かった点": {
                type: "object",
                properties: {
                  "ここが良かった": {
                    type: "string",
                    description: "具体的なタイムスタンプや場面を含む優秀なプレイの分析"
                  },
                  "ここが悪かった": {
                    type: "string",
                    description: "具体的な失敗場面とその原因、タイムスタンプ付きで分析"
                  },
                  "数値での評価": {
                    type: "string",
                    description: "KDA、CS、ダメージ等の統計データによる客観評価"
                  }
                },
                required: ["ここが良かった", "ここが悪かった", "数値での評価"],
                additionalProperties: false
              },
              "ターニングポイント分析": {
                type: "object",
                properties: {
                  "試合の転換点": {
                    type: "string",
                    description: "ここで試合が逆転した・決定的になった瞬間の詳細分析"
                  },
                  "重要な判断": {
                    type: "string",
                    description: "勝敗を分けた重要な判断やプレイの分析"
                  },
                  "もしもの選択": {
                    type: "string",
                    description: "その場面で違う選択をしていたらどうなったかの仮説"
                  }
                },
                required: ["試合の転換点", "重要な判断", "もしもの選択"],
                additionalProperties: false
              },
              "アイテムビルド分析": {
                type: "object",
                properties: {
                  "購入順序の評価": {
                    type: "string",
                    description: "分析対象プレイヤー（myParticipant）が実際に購入したアイテムのタイミングと選択の妥当性、各フェーズでの選択理由、より効率的だった代替ビルドの提案"
                  },
                  "相手チーム対応度": {
                    type: "string",
                    description: "分析対象プレイヤーのアイテム選択が敵チーム構成に対して適切だったか、対戦相手の脅威に対する防御アイテムの必要性、相手キャリーへの対策ができていたか"
                  },
                  "ビルド最適化提案": {
                    type: "string",
                    description: "同じ状況での理想的なアイテム構成、コストパフォーマンスの良いアイテム選択、試合状況に応じたビルド変更のタイミング"
                  }
                },
                required: ["購入順序の評価", "相手チーム対応度", "ビルド最適化提案"],
                additionalProperties: false
              },
              "具体的改善アドバイス": {
                type: "object",
                properties: {
                  "こうするとよい": {
                    type: "string",
                    description: "次回同じような場面での具体的な改善行動"
                  },
                  "気をつける点": {
                    type: "string",
                    description: "次回の試合で意識すべきスキルや判断力"
                  },
                  "戦術的提案": {
                    type: "string",
                    description: "同チャンピオン・同ロールでの戦術改善案"
                  }
                },
                required: ["こうするとよい", "気をつける点", "戦術的提案"],
                additionalProperties: false
              }
            },
            required: ["ゲーム全体の総評", "良かった点・悪かった点", "ターニングポイント分析", "アイテムビルド分析", "具体的改善アドバイス"],
            additionalProperties: false
          }
        }
      } as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` },
      ],
    });

    const finishReason = completion.choices?.[0]?.finish_reason;
    const responseText = completion.choices?.[0]?.message?.content || "";
    
    console.log("[AI] Post-match response meta", {
      finish_reason: finishReason,
      model: completion.model,
      usage: (completion as any).usage || undefined,
    });
    console.log("[AI] Post-match response content", responseText);
    
    // デバッグ用: レスポンスをtmpフォルダに保存
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `post-match-ai-response-${timestamp}.json`;
      const tmpDir = path.resolve(process.cwd(), 'tmp');
      
      // tmpディレクトリが存在しない場合は作成
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const filepath = path.join(tmpDir, filename);
      fs.writeFileSync(filepath, responseText, 'utf-8');
      console.log(`[AI] Post-match response saved to: ${filepath}`);
    } catch (saveError) {
      console.log("[AI] Failed to save post-match response:", saveError);
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError: any) {
      const snippet = responseText.slice(0, 500);
      const msg = String(parseError?.message || parseError);
      throw new Error(`Post-match JSON parse failed: ${msg}. finish_reason=${finishReason}. snippet=${snippet}`);
    }
  }

  private buildPostMatchPromptPayload(payload: PostMatchAdvicePayload) {
    // 自分のアイテム購入履歴を抽出
    const myItemPurchases = payload.matchData?.timelineEvents?.filter((event: any) => 
      event.type === 'ITEM' && event.isMyself === true
    ) || [];

    return JSON.stringify({
      matchId: payload.matchId,
      myChampionName: payload.matchData?.myParticipant?.championName,
      gameResult: payload.matchData?.myParticipant?.win ? 'WIN' : 'LOSE',
      myItemPurchases: myItemPurchases.map((item: any) => ({
        timeString: item.timeString,
        timestamp: item.timestamp,
        itemName: item.itemName,
        itemId: item.itemId,
        description: item.description
      })),
      ...payload.matchData,
    }, null, 2);
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

  private async loadPostMatchPrompts() {
    // 試合後分析用のプロンプトを読み込む
    const cwd = process.cwd();
    const systemPath = resolve(cwd, "server/prompts/system.md");
    const instructionPath = resolve(cwd, "server/prompts/post-match-instruction.md");
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, "utf-8"),
      readFile(instructionPath, "utf-8"),
    ]);
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() };
  }




}
