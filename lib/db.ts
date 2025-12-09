import initSqlJs from "sql.js";

// Minimal loose DB type (works perfectly)
type Database = any;

// Lazily loaded to avoid top-level await issues
let dbInstance: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = initSqlJs().then((SQL: any) => {
      const db = new SQL.Database();

      // MIGRATIONS -------------------------

      db.exec(`
        CREATE TABLE IF NOT EXISTS balances (
          player_id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL DEFAULT 0
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS reward_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          amount INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          ip TEXT,
          rejected INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_reward_events_player_time 
        ON reward_events(player_id, created_at);
      `);

      // Phase1
      try {
        db.exec("ALTER TABLE reward_events ADD COLUMN reason TEXT");
      } catch {}

      db.exec(`
        CREATE TABLE IF NOT EXISTS player_state (
          player_id TEXT PRIMARY KEY,
          last_q INTEGER,
          last_r INTEGER,
          updated_at INTEGER NOT NULL
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_quests (
          player_id TEXT NOT NULL,
          date_utc INTEGER NOT NULL,
          key TEXT NOT NULL,
          target INTEGER NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          reward INTEGER NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(player_id, date_utc, key)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS player_collections (
          player_id TEXT NOT NULL,
          item_key TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(player_id, item_key)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS streak_claims (
          player_id TEXT NOT NULL,
          key TEXT NOT NULL,
          claimed_at INTEGER NOT NULL,
          PRIMARY KEY(player_id, key)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS cosmetics (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          price_gold INTEGER NOT NULL DEFAULT 0,
          price_coins INTEGER NOT NULL DEFAULT 0
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS player_inventory (
          player_id TEXT NOT NULL,
          cosmetic_id TEXT NOT NULL,
          equipped INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(player_id, cosmetic_id)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_history (
          player_id TEXT NOT NULL,
          cosmetic_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          amount INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS coins_balance (
          player_id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL DEFAULT 0
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS cheater_flags (
          player_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          severity INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL
        );
      `);

      return db;
    });
  }

  return dbInstance;
}

// Query wrapper
export async function query(sql: string, params: any[] = []) {
  const db = await initDb();
  return db.exec(sql, params);
}

export async function getDb() {
  return initDb();
}
