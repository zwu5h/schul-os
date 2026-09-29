import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(process.env.AUTH_DATABASE_PATH || "data/auth.sqlite");
mkdirSync(dirname(path), { recursive: true });
const db = new Database(path);
db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
const name = "0001_auth.sql";
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE name = ?").get(name)) {
  const sql = readFileSync(resolve(root, "migrations", name), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(name);
  })();
  console.log(`Applied ${name}`);
}
db.close();
