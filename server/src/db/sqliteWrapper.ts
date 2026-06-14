import { getDatabase, saveDatabase } from "./database.js";

export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

export function prepare(sql: string): Statement {
  const db = getDatabase();
  const stmt = db.prepare(sql);

  return {
    run(...params: unknown[]) {
      stmt.bind(params as any);
      stmt.step();
      stmt.reset();
      saveDatabase();
      return { changes: db.getRowsModified(), lastInsertRowid: 0 };
    },
    get(...params: unknown[]) {
      stmt.bind(params as any);
      const hasRow = stmt.step();
      const row = hasRow ? stmt.getAsObject() : undefined;
      stmt.reset();
      return row as Record<string, unknown> | undefined;
    },
    all(...params: unknown[]) {
      stmt.bind(params as any);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.reset();
      return rows;
    },
  };
}

export function exec(sql: string): void {
  const db = getDatabase();
  db.exec(sql);
  saveDatabase();
}
