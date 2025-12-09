// Simple SQLite backup + vacuum (Phase 2)
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js").default;

async function backup() {
  const dbPath = process.env.DB_PATH || "piratemap.sqlite";
  const outDir = path.join("backups");
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:-]/g, "")
    .replace(/\..+/, "");

  const outPath = path.join(outDir, `piratemap-${timestamp}.sqlite`);

  try {
    fs.copyFileSync(dbPath, outPath);

    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(outPath));

    db.exec("VACUUM");
    fs.writeFileSync(outPath, Buffer.from(db.export()));

    console.log("Backup created:", outPath);
  } catch (e) {
    console.error("Backup failed:", e);
    process.exit(1);
  }
}

backup();
