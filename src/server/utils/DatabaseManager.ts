// データベース管理クラス
import type { Database as SQLiteDatabase } from 'better-sqlite3'

export interface DatabaseInterface {
  prepare(sql: string): any
  exec(sql: string): void
  close?(): void
}

export class DatabaseManager {
  private static instance: DatabaseInterface | null = null

  static getInstance(env?: any): DatabaseInterface {
    if (this.instance) return this.instance!

    // 開発環境：SQLite
    if (process.env.NODE_ENV === 'development' || !env?.LOGS_DB) {
      console.log('🔧 Using local SQLite database')
      this.instance = this.createSQLiteConnection()
    } 
    // 本番環境：Cloudflare D1
    else {
      console.log('☁️ Using Cloudflare D1 database')
      this.instance = env.LOGS_DB
    }

    return this.instance
  }

  private static createSQLiteConnection(): DatabaseInterface {
    const dbPath = process.env.DATABASE_URL || './dev-logs.db'
    // 動的インポートを使用
    const Database = require('better-sqlite3')
    const db = new Database(dbPath)
    
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
    `)
    
    return {
      prepare: (sql: string) => db.prepare(sql),
      exec: (sql: string) => db.exec(sql),
      close: () => db.close()
    }
  }

  static async saveLog(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any,
    env?: any
  ) {
    try {
      const db = this.getInstance(env)
      const stmt = db.prepare(`
        INSERT INTO logs (level, message, data) 
        VALUES (?, ?, ?)
      `)
      
      if (env?.LOGS_DB) {
        // D1の場合
        await stmt.bind(level, message, JSON.stringify(data || {})).run()
      } else {
        // SQLiteの場合
        stmt.run(level, message, JSON.stringify(data || {}))
      }
      
      console.log(`📝 Log saved: [${level.toUpperCase()}] ${message}`)
    } catch (error) {
      console.error('❌ Failed to save log:', error)
    }
  }

  static async getLogs(limit = 100, env?: any) {
    try {
      const db = this.getInstance(env)
      const stmt = db.prepare(`
        SELECT * FROM logs 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      
      if (env?.LOGS_DB) {
        // D1の場合
        const result = await stmt.bind(limit).all()
        return result.results || []
      } else {
        // SQLiteの場合
        return stmt.all(limit)
      }
    } catch (error) {
      console.error('❌ Failed to get logs:', error)
      return []
    }
  }
}