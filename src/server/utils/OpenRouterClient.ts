import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type AdvicePayload = {
  gameId: string;
  gameInfo: { gameMode: string; queueId: number };
  myTeam: Array<{
    championName: string;
    rank?: any;
    summonerLevel?: number;
    role?: string;
    teamId?: number;
  }>;
  enemyTeam: Array<{
    championName: string;
    rank?: any;
    summonerLevel?: number;
    role?: string;
    teamId?: number;
  }>;
};

export class OpenRouterClient {
  private client: OpenAI;
  private model: string;

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
    this.model = or.model;
  }

  async generateAdvice(payload: AdvicePayload) {
    const { systemPrompt, instruction } = await this.loadPrompts();
    const inputJson = this.buildPromptPayload(payload);

    try {
      const my = Array.isArray(payload.myTeam)
        ? payload.myTeam.map((p) => p.championName)
        : [];
      const en = Array.isArray(payload.enemyTeam)
        ? payload.enemyTeam.map((p) => p.championName)
        : [];
      console.log("[AI] Request summary", {
        model: this.model,
        gameId: payload.gameId,
        gameMode: payload.gameInfo?.gameMode,
        queueId: payload.gameInfo?.queueId,
        myTeam: my,
        enemyTeam: en,
      });
    } catch {
      // noop
    }

    // 1回目: 通常生成（長文詳細出力用にトークン数大幅増加）
    const first = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      max_tokens: 8000, // 3000 → 8000に大幅増量
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${instruction}\n\n[INPUT]\n${inputJson}` },
      ],
    });
    const finish1 = first.choices?.[0]?.finish_reason;
    const raw1 = first.choices?.[0]?.message?.content || "";
    const text1 = this.extractJson(raw1);
    console.log("[AI] Response meta", {
      finish_reason: finish1,
      model: first.model,
      usage: (first as any).usage || undefined,
    });
    console.log("[AI] Response content", text1);
    try {
      return JSON.parse(text1);
    } catch (e1: any) {
      const snippet1 = text1.slice(0, 500);
      const msg1 = String(e1?.message || e1);
      throw new Error(`JSON parse failed: ${msg1}. snippet=${snippet1}`);
    }
  }

  private buildPromptPayload(payload: AdvicePayload) {
    return JSON.stringify({
      // ChampionID ではなく ChampionName を含む入力を渡す
      ...payload,
      schema: {
        マッチアップ分析: [
          {
            自分のチャンピオン: "string",
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

  private extractJson(text: string): string {
    if (!text) return "{}";
    // コードフェンス内のJSONを優先
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let body: string = (fence ? fence[1] : text) ?? "";
    body = body.trim().replace(/^\uFEFF/, "");

    // バランスドスキャン（{}, [] と文字列）で最初のJSONブロックを抽出
    const firstBrace = body.indexOf("{");
    if (firstBrace === -1) return "{}";
    let i = firstBrace;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (; i < body.length; i++) {
      const ch = body.charAt(i);
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
      } else {
        if (ch === '"') {
          inString = true;
        } else if (ch === "{" || ch === "[") {
          stack.push(ch);
        } else if (ch === "}" || ch === "]") {
          const top = stack[stack.length - 1];
          if ((ch === "}" && top === "{") || (ch === "]" && top === "[")) {
            stack.pop();
            if (stack.length === 0) {
              i++;
              break;
            }
          } else {
            // 不整合の場合は無視して続行
          }
        }
      }
    }
    let candidate = body.slice(firstBrace, i);
    if (stack.length > 0) {
      // 最後まで到達したのに閉じていない → 足りない閉じ括弧を補完
      const closers = stack
        .slice()
        .reverse()
        .map((s) => (s === "{" ? "}" : "]"))
        .join("");
      candidate = body.slice(firstBrace) + closers;
    }

    // 文字列中の改行/復帰/タブをエスケープ（未エスケープ改行対策）
    candidate = this.escapeNewlinesInStrings(candidate);
    // スマートクォートの正規化
    candidate = candidate
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, '"');
    // 末尾カンマの除去（,] / ,}）
    candidate = candidate.replace(/,\s*(?=[}\]])/g, "");
    return candidate;
  }

  private escapeNewlinesInStrings(jsonLike: string): string {
    let out = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < jsonLike.length; i++) {
      const ch = jsonLike.charAt(i);
      if (inString) {
        if (escaped) {
          out += ch;
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          out += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          out += ch;
          inString = false;
          continue;
        }
        if (ch === "\n") {
          out += "\\n";
          continue;
        }
        if (ch === "\r") {
          out += "\\r";
          continue;
        }
        if (ch === "\t") {
          out += "\\t";
          continue;
        }
        // 制御文字の除去（安全側）
        const code = ch.charCodeAt(0);
        if (code >= 0 && code < 0x20) {
          out += "";
          continue;
        }
        out += ch;
      } else {
        if (ch === '"') {
          inString = true;
          out += ch;
          continue;
        }
        out += ch;
      }
    }
    return out;
  }
}
