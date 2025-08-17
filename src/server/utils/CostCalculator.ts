/**
 * OpenRouter API 費用計算ユーティリティクラス
 *
 * 各モデルのトークン料金から使用コストを計算する
 */

export interface ModelPricing {
  input: number; // input token単価（USD per token）
  output: number; // output token単価（USD per token）
}

export interface CostResult {
  input_cost_usd: number; // Input token cost in USD
  output_cost_usd: number; // Output token cost in USD
  total_cost_usd: number; // Total cost in USD
  total_cost_jpy: number; // Total cost in JPY (参考値)
}

export class CostCalculator {
  // モデル別料金定義（2025年8月時点）
  private static MODEL_PRICING: Record<string, ModelPricing> = {
    "google/gemini-2.5-flash-lite": {
      input: 0.0000001, // $0.10 per 1M tokens
      output: 0.0000004, // $0.40 per 1M tokens
    },
    "google/gemini-2.5-flash": {
      input: 0.0000003, // $0.30 per 1M tokens
      output: 0.0000025, // $2.50 per 1M tokens
    },
    "google/gemini-2.5-pro": {
      input: 0.00000125, // $1.25 per 1M tokens (<=200K)
      output: 0.00001, // $10 per 1M tokens (<=200K)
    },
    "openai/gpt-5-mini": {
      input: 0.00000025, // $0.25 per 1M tokens
      output: 0.000002, // $2.00 per 1M tokens
    },
    "openai/gpt-5-nano": {
      input: 0.00000005, // $0.05 per 1M tokens
      output: 0.0000004, // $0.40 per 1M tokens
    },
  };

  // USD/JPY レート（参考値、実際の為替レートではない）
  private static USD_TO_JPY_RATE = 150;

  /**
   * モデル使用コストを計算
   * @param model モデル名
   * @param inputTokens input token数
   * @param outputTokens output token数
   * @returns 費用計算結果またはnull（不明なモデルの場合）
   */
  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostResult | null {
    const pricing = this.getModelPricing(model);

    if (!pricing) {
      return null;
    }

    const inputCostUsd = inputTokens * pricing.input;
    const outputCostUsd = outputTokens * pricing.output;
    const totalCostUsd = inputCostUsd + outputCostUsd;
    const totalCostJpy = totalCostUsd * this.USD_TO_JPY_RATE;

    return {
      input_cost_usd: inputCostUsd,
      output_cost_usd: outputCostUsd,
      total_cost_usd: totalCostUsd,
      total_cost_jpy: totalCostJpy,
    };
  }

  /**
   * モデルの料金情報を取得
   * @param model モデル名
   * @returns モデル料金情報またはnull（不明なモデルの場合）
   */
  static getModelPricing(model: string): ModelPricing | null {
    const pricing = this.MODEL_PRICING[model];

    if (!pricing) {
      console.warn(
        `[CostCalculator] Unknown model: ${model}, skipping cost calculation`
      );
      return null;
    }

    return pricing;
  }

  /**
   * モデルが料金計算可能かチェック
   * @param model モデル名
   * @returns 料金計算可能かどうか
   */
  static isModelSupported(model: string): boolean {
    return this.MODEL_PRICING[model] !== undefined;
  }

  /**
   * 費用を指定通貨でフォーマット
   * @param cost 費用（USD）
   * @param currency 通貨
   * @returns フォーマットされた費用文字列
   */
  static formatCost(cost: number, currency: "USD" | "JPY" = "USD"): string {
    if (currency === "JPY") {
      const jpyCost = cost * this.USD_TO_JPY_RATE;
      return `¥${jpyCost.toFixed(3)}`;
    }

    return `$${cost.toFixed(6)}`;
  }

  /**
   * 利用可能なモデル一覧を取得
   * @returns モデル名の配列
   */
  static getAvailableModels(): string[] {
    return Object.keys(this.MODEL_PRICING);
  }

  /**
   * モデル料金情報を追加・更新
   * @param model モデル名
   * @param pricing 料金情報
   */
  static updateModelPricing(model: string, pricing: ModelPricing): void {
    this.MODEL_PRICING[model] = pricing;
    console.log(`[CostCalculator] Updated pricing for model: ${model}`);
  }
}
