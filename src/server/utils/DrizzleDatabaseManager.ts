import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import path from "path";

/**
 * Drizzle ORM データベース管理クラス（シングルトン）
 *
 * このクラスはDrizzleのインスタンスをシングルトンとして管理し、
 * アプリケーション全体で単一のデータベース接続を共有します。
 *
 * 現在はローカルSQLite環境での実行のみをサポートします。
 */
export class DrizzleDatabaseManager {
  private static localSqliteInstance: any;

  /**
   * Drizzleのシングルトンインスタンスを取得します。
   *
   * 現在はローカルSQLite環境での実行のみをサポートします。
   *
   * @returns Drizzleのデータベースインスタンス
   * @throws データベース接続に失敗した場合にエラーをスローします。
   */
  public static getInstance(): any {
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
  private static createLocalInstance() {
    try {
      // drizzle.config.tsと同じパスを使用
      const dbPath = path.resolve(process.cwd(), "local.db");
      console.log(
        `[DrizzleDatabaseManager] Connecting to local SQLite: ${dbPath}`
      );

      const sqlite = new Database(dbPath);
      return drizzleSqlite(sqlite, { schema });
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
}
