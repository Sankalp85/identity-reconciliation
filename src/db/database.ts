import sqlite3 from "sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../contacts.db");

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err);
      } else {
        console.log("Connected to SQLite database");
      }
    });
  }

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(
          `CREATE TABLE IF NOT EXISTS Contact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phoneNumber TEXT,
          email TEXT,
          linkedId INTEGER,
          linkPrecedence TEXT NOT NULL DEFAULT 'primary',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          deletedAt DATETIME
        )`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  run(sql: string, params: any[] = []) {
    return new Promise<any>((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql: string, params: any[] = []) {
    return new Promise<any>((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []) {
    return new Promise<any[]>((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const db = new Database();
