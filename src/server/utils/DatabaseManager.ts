// データベース管理クラス
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

export interface DatabaseInterface {
  prepare(sql: string): any;
  exec(sql: string): void;
  close?(): void;
}

// sql.js用のStatement wrapper
class SqlJsStatement {
  constructor(private db: SqlJsDatabase, private sql: string) {}

  run(...params: any[]) {
    try {
      this.db.run(this.sql, params);
      return { changes: this.db.getRowsModified() };
    } catch (error) {
      console.error("SQL execution error:", error);
      throw error;
    }
  }

  all(...params: any[]) {
    try {
      const stmt = this.db.prepare(this.sql);
      const result = [];
      stmt.bind(params);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row);
      }
      stmt.free();
      return result;
    } catch (error) {
      console.error("SQL query error:", error);
      throw error;
    }
  }

  async bind(...params: any[]) {
    return { run: () => this.run(...params), all: () => this.all(...params) };
  }
}

export class DatabaseManager {
  private static instance: DatabaseInterface | null = null;

  static async getInstance(env?: any): Promise<DatabaseInterface> {
    if (this.instance) return this.instance;

    // 開発環境：SQLite
    if (process.env.NODE_ENV === "development" || !env?.LOGS_DB) {
      console.log("🔧 Using local SQLite database");
      this.instance = await this.createSQLiteConnection();
    }
    // 本番環境：Cloudflare D1
    else {
      console.log("☁️ Using Cloudflare D1 database");
      this.instance = env.LOGS_DB;
    }

    return this.instance as DatabaseInterface;
  }

  private static async createSQLiteConnection(): Promise<DatabaseInterface> {
    const dbPath = process.env.DATABASE_URL || "./dev-logs.db";

    try {
      // sql.js初期化
      const SQL = await initSqlJs();

      let db: SqlJsDatabase;

      // 既存のDBファイルがあれば読み込み
      if (existsSync(dbPath)) {
        const filebuffer = readFileSync(dbPath);
        db = new SQL.Database(filebuffer);
      } else {
        // 新規作成
        db = new SQL.Database();
      }

      // テーブル作成
      db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 定期的にファイルに保存
      const saveToFile = () => {
        try {
          const data = db.export();
          writeFileSync(dbPath, data);
        } catch (error) {
          console.error("Failed to save database:", error);
        }
      };

      // 5秒ごとに保存
      setInterval(saveToFile, 5000);

      // プロセス終了時に保存
      process.on("exit", saveToFile);
      process.on("SIGTERM", saveToFile);
      process.on("SIGINT", saveToFile);

      return {
        prepare: (sql: string) => new SqlJsStatement(db, sql),
        exec: (sql: string) => {
          db.exec(sql);
          saveToFile(); // 即座に保存
        },
        close: () => {
          saveToFile();
          db.close();
        },
      };
    } catch (error) {
      console.error("Failed to initialize SQLite:", error);
      throw error;
    }
  }

  static async saveLog(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    data?: any,
    env?: any
  ) {
    try {
      const db = await this.getInstance(env);
      const stmt = db.prepare(`
        INSERT INTO logs (level, message, data) 
        VALUES (?, ?, ?)
      `);

      if (env?.LOGS_DB) {
        // D1の場合
        await stmt.bind(level, message, JSON.stringify(data || {})).run();
      } else {
        // SQLiteの場合
        stmt.run(level, message, JSON.stringify(data || {}));
      }

      console.log(`📝 Log saved: [${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error("❌ Failed to save log:", error);
    }
  }

  static async getLogs(limit = 100, env?: any) {
    try {
      const db = await this.getInstance(env);
      const stmt = db.prepare(`
        SELECT * FROM logs 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);

      if (env?.LOGS_DB) {
        // D1の場合
        const result = await stmt.bind(limit).all();
        return result.results || [];
      } else {
        // SQLiteの場合
        return stmt.all(limit);
      }
    } catch (error) {
      console.error("❌ Failed to get logs:", error);
      return [];
    }
  }
}
