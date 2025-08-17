/**
 * OpenRouter API 費用ログ管理クラス
 * 
 * Winstonを使用してAPI使用料金を日別ファイルに記録
 */

import winston from 'winston'
import 'winston-daily-rotate-file'
import DailyRotateFile from 'winston-daily-rotate-file'
import { v4 as uuidv4 } from 'uuid'
import { CostCalculator, type CostResult } from './CostCalculator'

export interface CostLogEntry {
  id: string                    // ユニークID (UUID)
  timestamp: string            // ISO8601形式
  endpoint: string             // '/api/advice/pre-match' など
  model: string                // 使用モデル名
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cost: CostResult             // 費用計算結果
  metadata?: {                 // オプションメタデータ
    gameId?: string           // ゲーム関連の場合
    matchId?: string          // 試合関連の場合
    userId?: string           // ユーザーID（将来的に）
    sessionId?: string        // セッションID
    [key: string]: any        // その他のメタデータ
  }
  response_time_ms: number    // レスポンス時間
  success: boolean            // API呼び出し成功/失敗
  error?: string              // エラー内容（失敗時）
}

export class CostLogger {
  private static logger: winston.Logger | null = null

  /**
   * Winstonロガーの初期化
   */
  private static initializeLogger(): winston.Logger {
    if (this.logger) {
      return this.logger
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/cost-logs/cost-%DATE%.jsonl',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',          // 1ファイル最大20MB
          maxFiles: '30d',         // 30日間保持
          format: winston.format.printf(info => JSON.stringify(info)),
          createSymlink: false,    // シンボリックリンク作成無効
          auditFile: 'logs/cost-logs/.audit.json'  // 監査ファイル
        }),
        // 開発環境ではコンソール出力も追加
        ...(process.env.NODE_ENV === 'development' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ] : [])
      ]
    })

    console.log('[CostLogger] Winston logger initialized')
    return this.logger
  }

  /**
   * 費用ログを記録
   * @param entry ログエントリ
   */
  static async logCost(entry: Partial<CostLogEntry>): Promise<void> {
    try {
      const logger = this.initializeLogger()
      
      // 必須フィールドのデフォルト値設定
      const logEntry: CostLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        endpoint: entry.endpoint || 'unknown',
        model: entry.model || 'unknown',
        usage: entry.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        cost: entry.cost || {
          input_cost_usd: 0,
          output_cost_usd: 0,
          total_cost_usd: 0,
          total_cost_jpy: 0
        },
        metadata: entry.metadata,
        response_time_ms: entry.response_time_ms || 0,
        success: entry.success ?? false,
        error: entry.error
      }

      // ログ出力
      logger.info(logEntry)
      
      // 開発環境では詳細ログも出力
      if (process.env.NODE_ENV === 'development') {
        console.log('[CostLogger] Cost logged:', {
          endpoint: logEntry.endpoint,
          model: logEntry.model,
          total_cost_usd: logEntry.cost.total_cost_usd,
          total_tokens: logEntry.usage.total_tokens,
          success: logEntry.success
        })
      }

    } catch (error) {
      console.error('[CostLogger] Failed to log cost:', error)
      // ログ記録失敗でもアプリケーションは継続する
    }
  }

  /**
   * 簡単な費用ログ記録（使用量から自動計算）
   * @param endpoint APIエンドポイント
   * @param model モデル名
   * @param usage 使用量情報
   * @param metadata メタデータ
   * @param responseTimeMs レスポンス時間
   * @param success 成功フラグ
   * @param error エラーメッセージ
   */
  static async logCostSimple(
    endpoint: string,
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    metadata?: any,
    responseTimeMs: number = 0,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    // 料金計算不可能なモデルの場合はログを生成しない
    if (!CostCalculator.isModelSupported(model)) {
      console.log(`[CostLogger] Skipping cost log for unsupported model: ${model}`)
      return
    }

    const cost = CostCalculator.calculateCost(
      model,
      usage.prompt_tokens,
      usage.completion_tokens
    )

    if (!cost) {
      console.log(`[CostLogger] Failed to calculate cost for model: ${model}, skipping log`)
      return
    }

    await this.logCost({
      endpoint,
      model,
      usage,
      cost,
      metadata,
      response_time_ms: responseTimeMs,
      success,
      error
    })
  }

  /**
   * エラー専用ログ記録
   * @param endpoint APIエンドポイント
   * @param model モデル名
   * @param error エラーメッセージ
   * @param responseTimeMs レスポンス時間
   * @param metadata メタデータ
   */
  static async logError(
    endpoint: string,
    model: string,
    error: string,
    responseTimeMs: number = 0,
    metadata?: any
  ): Promise<void> {
    await this.logCost({
      endpoint,
      model,
      success: false,
      error,
      response_time_ms: responseTimeMs,
      metadata
    })
  }

  /**
   * ロガーのクリーンアップ
   */
  static async cleanup(): Promise<void> {
    if (this.logger) {
      await new Promise<void>((resolve) => {
        this.logger?.end(() => {
          console.log('[CostLogger] Logger cleanup completed')
          resolve()
        })
      })
      this.logger = null
    }
  }
}