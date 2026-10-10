import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

// One connection per process (web and worker each open their own; WAL lets them share safely).
const g = globalThis as unknown as { __pitchwalaDb?: { db: DB; raw: Database.Database } };

function open() {
  const file = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/agent.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new Database(file);
  raw.pragma("journal_mode = WAL");
  raw.pragma("busy_timeout = 5000");
  raw.pragma("foreign_keys = ON");
  const db = drizzle(raw, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return { db, raw };
}

export function getDb(): DB {
  if (!g.__pitchwalaDb) g.__pitchwalaDb = open();
  return g.__pitchwalaDb.db;
}

export function getRaw(): Database.Database {
  if (!g.__pitchwalaDb) g.__pitchwalaDb = open();
  return g.__pitchwalaDb.raw;
}

export { schema };
