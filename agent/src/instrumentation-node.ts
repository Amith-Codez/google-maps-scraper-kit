import { getEnv } from "./lib/env";
import { getDb } from "./lib/db";

// Refuse to start with a clear message if a setting is missing; then open (and migrate) the database.
try {
  getEnv();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
getDb();
