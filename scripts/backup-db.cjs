// Simple SQLite backup + vacuum (Phase 2)
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "piratemap.sqlite";
const outDir = path.join("backups");
fs.mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:-]/g,"").replace(/\..+/, "");
const outPath = path.join(outDir, `piratemap-${timestamp}.sqlite`);

try {
  fs.copyFileSync(dbPath, outPath);
  const db = new Database(outPath);
  db.pragma("journal_mode = WAL");
  db.exec("VACUUM");
  db.close();
  console.log("Backup created:", outPath);
} catch (e) {
  console.error("Backup failed:", e);
  process.exit(1);
}
