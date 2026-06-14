import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { SCHEMA_SQL } from "./schema.js";
import { SERVER_CONFIG } from "../config.js";

// sql.js in-memory DB with file persistence helper
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let db: InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]>

/**
 * Robustly locate the sql.js wasm binary regardless of whether the server is
 * run via tsx (source) or compiled node (dist). createRequire resolves the
 * package from this module's URL, honouring npm workspace hoisting.
 */
function resolveSqlJsWasmPath(): string {
  const require = createRequire(import.meta.url);
  const candidates: string[] = [];
  try {
    const sqlJsMain = require.resolve("sql.js");
    candidates.push(path.join(path.dirname(sqlJsMain), "sql-wasm.wasm"));
  } catch {
    /* ignore */
  }
  try {
    candidates.push(require.resolve("sql.js/dist/sql-wasm.wasm"));
  } catch {
    /* ignore */
  }
  // Walk up from this file looking for node_modules/sql.js (last resort).
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(dir, "node_modules/sql.js/dist/sql-wasm.wasm"));
    dir = path.dirname(dir);
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // If we somehow can't find it, let sql.js try its default and surface the error.
  return "sql-wasm.wasm";
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
