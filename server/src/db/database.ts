import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCHEMA_SQL } from "./schema.js";
import { SERVER_CONFIG } from "../config.js";

// sql.js in-memory DB with file persistence helper
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let db: InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]>

function resolveSqlJsWasmPath(): string {
  try {
    // Resolve sql.js package root from the actual runtime location
    const sqlJsMain = require.resolve("sql.js");
    return path.join(path.dirname(sqlJsMain), "sql-wasm.wasm");
  } catch {
    // Fallback for ESM-only environments without require.resolve
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
    return path.join(root, "node_modules/sql.js/dist/sql-wasm.wasm");
  }
}

export async function initDatabase(): Promise<void> {
  if (SQL) return;
  const wasmPath = resolveSqlJsWasmPath();
  SQL = await initSqlJs({
    locateFile: (file) => {
      if (file === "sql-wasm.wasm") return wasmPath;
      return path.join(path.dirname(wasmPath), file);
    },
  });

  const dbPath = path.resolve(SERVER_CONFIG.dbPath);
  let data: Buffer | undefined;
  try {
    data = fs.readFileSync(dbPath);
  } catch {
    data = undefined;
  }

  if (data) {
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
  }

  db.exec(SCHEMA_SQL);
}

export function getDatabase(): InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]> {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const dbPath = path.resolve(SERVER_CONFIG.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function closeDatabase(): void {
  saveDatabase();
  if (db) {
    db.close();
    db = null as any;
  }
}
