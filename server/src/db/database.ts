import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema.js";
import { SERVER_CONFIG } from "../config.js";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(SERVER_CONFIG.dbPath);
    db.exec(SCHEMA_SQL);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
