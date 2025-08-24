import * as schema from "../db/schema";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import path from "path";
import { createRequire } from "module";

/**
 * Drizzle ORM データベース管理クラス（シングルトン）
 *
 * このクラスはDrizzleのインスタンスをシングルトンとして管理し、
 * アプリケーション全体で単一のデータベース接続を共有します。
 *
 * 現在はローカルSQLite環境での実行のみをサポートします。
 */
// Cloudflare 環境検出は server/middleware/cloudflare-env.ts が設定する

export class DrizzleDatabaseManager {
  private static localSqliteInstance: any;
  private static d1Instance: any;

  /**
   * Drizzleのシングルトンインスタンスを取得します。
   *
   * 現在はローカルSQLite環境での実行のみをサポートします。
   *
   * @returns Drizzleのデータベースインスタンス
   * @throws データベース接続に失敗した場合にエラーをスローします。
   */
  public static getInstance(): any {
    // Cloudflare Workers (D1) 環境判定: ミドルウェアが設定するグローバルから取得
    const cfEnv = (globalThis as any)?.__CLOUDFLARE_ENV__;
    if (cfEnv?.DB) {
      if (!DrizzleDatabaseManager.d1Instance) {
        DrizzleDatabaseManager.d1Instance =
          DrizzleDatabaseManager.createD1Instance(cfEnv);
      }
      return DrizzleDatabaseManager.d1Instance;
    }

    // それ以外はローカル SQLite
    if (!DrizzleDatabaseManager.localSqliteInstance) {
      DrizzleDatabaseManager.localSqliteInstance =
        DrizzleDatabaseManager.createLocalInstance();
    }
    return DrizzleDatabaseManager.localSqliteInstance;
  }

  /**
   * ローカル開発環境用のSQLite接続インスタンスを作成します。
   *
   * @returns ローカルSQLiteデータベースインスタンス
   */
  private static asyncImport<T = any>(specifier: string): Promise<T> {
    // 動的 import ヘルパー（ビルド環境差異対策）
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return import(specifier) as any;
  }

  private static createLocalInstance() {
    try {
      // Docker compose の working_dir=/src を前提に cwd 基準で固定
      // （ローカル手動実行時もプロジェクトの src 直下で実行する想定）
      const dbPath = path.resolve(process.cwd(), "local.db");
      console.log(
        `[DrizzleDatabaseManager] Connecting to local SQLite: ${dbPath}`
      );

      // ESM 環境での CJS ローダー
      const req = createRequire(import.meta.url);
      const BetterSqlite3 = req("better-sqlite3");
      const sqlite = new BetterSqlite3(dbPath);
      const { drizzle } = req("drizzle-orm/better-sqlite3");
      return drizzle(sqlite, { schema });
    } catch (error) {
      console.error(
        "[DrizzleDatabaseManager] Failed to create local SQLite connection:",
        error
      );
      throw new Error(
        `ローカルSQLiteデータベースへの接続に失敗しました: ${error}`
      );
    }
  }

  /**
   * Cloudflare D1 環境用の接続インスタンスを作成します。
   */
  private static createD1Instance(cfEnv: { DB: any }) {
    try {
      // 直輸入でESM/Workers両対応
      console.log(
        "[DrizzleDatabaseManager] Connecting to Cloudflare D1 binding 'DB'"
      );
      return drizzleD1(cfEnv.DB, { schema });
    } catch (error) {
      console.error(
        "[DrizzleDatabaseManager] Failed to create D1 connection:",
        error
      );
      throw new Error(`Cloudflare D1 への接続に失敗しました: ${error}`);
    }
  }
}
