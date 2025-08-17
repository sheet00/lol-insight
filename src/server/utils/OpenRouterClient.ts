import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CostLogger } from "./CostLogger";
import { CostCalculator } from "./CostCalculator";

export type PreMatchAdvicePayload = {
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

/**
 * OpenRouter API クライアント
 * League of Legends アドバイス生成用のAI APIクライアント
 */
export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  /**
   * OpenRouterClientのコンストラクター
   * 環境変数からAPIキーとモデル設定を読み込み、OpenAIクライアントを初期化
   */
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
        throw new Error(
          "デフォルトモデルが設定されていません（OPENROUTER_MODEL または AVAILABLE_AI_MODELS が必要です）"
        );
      }
    }

    this.client = new OpenAI({
      baseURL: or.baseURL || "https://openrouter.ai/api/v1",
      apiKey: or.apiKey,
      defaultHeaders: {
        "HTTP-Referer":
          or.httpReferer || "https://github.com/your-org/lol-teacher",
        "X-Title": or.xTitle || "lol-teacher",
      },
    });
    this.defaultModel = defaultModel;
  }

  /**
   * 試合前アドバイス生成
   * @param payload 試合情報とチーム構成データ
   * @returns 生成されたアドバイス（JSON形式）
   */
  async generatePreMatchAdvice(payload: PreMatchAdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPreMatchPrompts();
    const inputJson = this.buildPromptPayload(payload);
    const schema = await this.loadJsonSchema("pre-match");

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

    // 共通API呼び出しメソッドを使用
    const response = await this.makeRequest(
      modelToUse,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` },
      ],
      {
        temperature: 0.4,
        max_tokens: 65536,
        response_format: {
          type: "json_schema",
          json_schema: schema,
        } as any,
      },
      "/api/advice/pre-match",
      { gameId: payload.gameId }
    );

    // 共通レスポンス処理メソッドを使用
    return await this.processResponse(response, "pre-match");
  }

  /**
   * 試合前アドバイス用プロンプトペイロード構築
   * @param payload 試合情報
   * @returns JSONペイロード文字列
   */
  private buildPromptPayload(payload: PreMatchAdvicePayload) {
    return JSON.stringify({
      // 自分のチャンピオンを明確に指定
      myChampionName: payload.myChampion?.championName,
      // ChampionID ではなく ChampionName を含む入力を渡す
      ...payload,
      schema: {
        対面チャンピオン分析: {
          警戒ポイント:
            "string (対面チャンピオンの危険なタイミング、スキル、行動パターンを具体的に説明)",
          対策方法:
            "string (対面チャンピオンに対する具体的な対策、ポジショニング、スキルの使い方を説明)",
        },
        自分の戦略: {
          レーン戦:
            "string (レーン戦での具体的な立ち回り、ファーム方法、ハラスのタイミング、ガンク対応を説明)",
          集団戦:
            "string (集団戦での役割、ポジション、スキルの使用順序、狙うべきターゲットを説明)",
          装備戦略:
            "string (相手チーム構成に合わせた装備選択、アイテムの優先順位、状況別の装備変更を説明)",
        },
      },
    });
  }

  /**
   * 試合後分析アドバイス生成
   * @param payload 試合結果データ
   * @returns 生成された分析結果（JSON形式）
   */
  async generatePostMatchAdvice(payload: PostMatchAdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPostMatchPrompts();
    const inputJson = this.buildPostMatchPromptPayload(payload);
    const schema = await this.loadJsonSchema("post-match");

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
        result: payload.matchData?.myParticipant?.win ? "WIN" : "LOSE",
        timelineEventsCount: payload.matchData?.timelineEvents?.length || 0,
      });
    } catch {
      // noop
    }

    // 共通API呼び出しメソッドを使用
    const response = await this.makeRequest(
      modelToUse,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` },
      ],
      {
        temperature: 0.6,
        max_tokens: 65536,
        response_format: {
          type: "json_schema",
          json_schema: schema,
        } as any,
      },
      "/api/advice/post-match",
      { matchId: payload.matchId }
    );

    // 共通レスポンス処理メソッドを使用
    return await this.processResponse(response, "post-match");
  }

  /**
   * 試合後分析用プロンプトペイロード構築
   * @param payload 試合結果データ
   * @returns JSONペイロード文字列
   */
  private buildPostMatchPromptPayload(payload: PostMatchAdvicePayload) {
    // 自分のアイテム購入履歴を抽出
    const myItemPurchases =
      payload.matchData?.timelineEvents?.filter(
        (event: any) => event.type === "ITEM" && event.isMyself === true
      ) || [];

    return JSON.stringify(
      {
        matchId: payload.matchId,
        myChampionName: payload.matchData?.myParticipant?.championName,
        gameResult: payload.matchData?.myParticipant?.win ? "WIN" : "LOSE",
        myItemPurchases: myItemPurchases.map((item: any) => ({
          timeString: item.timeString,
          timestamp: item.timestamp,
          itemName: item.itemName,
          itemId: item.itemId,
          description: item.description,
        })),
        ...payload.matchData,
      },
      null,
      2
    );
  }

  /**
   * 試合前アドバイス用プロンプトファイル読み込み
   * @returns システムプロンプトと指示文
   */
  private async loadPreMatchPrompts() {
    // 常にMDを読み込む（ホットリロード用途）
    const cwd = process.cwd();
    const systemPath = resolve(cwd, "server/prompts/system.md");
    const instructionPath = resolve(
      cwd,
      "server/prompts/pre-match-instruction.md"
    );
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, "utf-8"),
      readFile(instructionPath, "utf-8"),
    ]);
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() };
  }

  /**
   * 試合後分析用プロンプトファイル読み込み
   * @returns システムプロンプトと指示文
   */
  private async loadPostMatchPrompts() {
    // 試合後分析用のプロンプトを読み込む
    const cwd = process.cwd();
    const systemPath = resolve(cwd, "server/prompts/system.md");
    const instructionPath = resolve(
      cwd,
      "server/prompts/post-match-instruction.md"
    );
    const [sysBuf, insBuf] = await Promise.all([
      readFile(systemPath, "utf-8"),
      readFile(instructionPath, "utf-8"),
    ]);
    return { systemPrompt: sysBuf.trim(), instruction: insBuf.trim() };
  }

  /**
   * JSONスキーマファイル読み込み
   * @param schemaType スキーマタイプ（pre-match | post-match）
   * @returns パースされたJSONスキーマオブジェクト
   */
  private async loadJsonSchema(
    schemaType: "pre-match" | "post-match"
  ): Promise<any> {
    const cwd = process.cwd();
    const schemaPath = resolve(cwd, `server/schemas/${schemaType}-schema.json`);

    try {
      const schemaBuf = await readFile(schemaPath, "utf-8");
      return JSON.parse(schemaBuf);
    } catch (error) {
      console.error(
        `[OpenRouterClient] Failed to load ${schemaType} schema:`,
        error
      );
      throw new Error(`Failed to load ${schemaType} JSON schema`);
    }
  }

  /**
   * 共通API呼び出しメソッド（費用ログ統合）
   * @param model 使用するAIモデル名
   * @param messages チャットメッセージ配列
   * @param config API設定オブジェクト
   * @param endpoint APIエンドポイント名（ログ用）
   * @param metadata 追加メタデータ（ログ用）
   * @returns OpenAI APIレスポンス
   */
  private async makeRequest(
    model: string,
    messages: any[],
    config: any,
    endpoint: string,
    metadata?: any
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        ...config,
        messages,
      });

      const responseTime = Date.now() - startTime;

      // 費用ログを統一処理
      if (response.usage) {
        await CostLogger.logCostSimple(
          endpoint,
          model,
          {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          },
          metadata,
          responseTime,
          true
        );
      }

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // エラー時も費用ログ記録
      await CostLogger.logError(
        endpoint,
        model,
        error.message || String(error),
        responseTime,
        metadata
      );

      throw error;
    }
  }

  /**
   * 共通レスポンス処理メソッド
   * @param response OpenAI APIレスポンス
   * @param responseType レスポンスタイプ（pre-match | post-match）
   * @returns パースされたJSONオブジェクト
   */
  private async processResponse(
    response: any,
    responseType: "pre-match" | "post-match"
  ): Promise<any> {
    const finishReason = response.choices?.[0]?.finish_reason;
    const responseText = response.choices?.[0]?.message?.content || "";

    // 統一ログ出力
    console.log(`[AI] ${responseType} response meta`, {
      finish_reason: finishReason,
      model: response.model,
      usage: response.usage || undefined,
    });

    // 統一JSONレスポンス保存
    await this.saveJsonResponse(responseText, responseType);

    // JSON解析
    try {
      return JSON.parse(responseText);
    } catch (parseError: any) {
      const snippet = responseText.slice(0, 500);
      const msg = String(parseError?.message || parseError);
      throw new Error(
        `${responseType} JSON parse failed: ${msg}. finish_reason=${finishReason}. snippet=${snippet}`
      );
    }
  }

  /**
   * 共通JSONレスポンス保存メソッド
   * @param content 保存するJSONコンテンツ
   * @param type ファイル名プレフィックス
   */
  private async saveJsonResponse(content: string, type: string): Promise<void> {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${type}-ai-response-${timestamp}.json`;
      const tmpDir = path.resolve(process.cwd(), "tmp");

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const filepath = path.join(tmpDir, filename);
      fs.writeFileSync(filepath, content, "utf-8");
      console.log(`[AI] ${type} response saved to: ${filepath}`);
    } catch (saveError) {
      console.log(`[AI] Failed to save ${type} response:`, saveError);
    }
  }
}
