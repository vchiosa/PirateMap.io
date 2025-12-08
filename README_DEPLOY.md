# PirateMap.io — Web‑2 Deploy Guide

## 1) Environment
Copy `.env.example` → `.env` and set values:
\`\`\`
DB_PATH=piratemap.sqlite
DAILY_CAP=25000
REWARD_COOLDOWN_MS=800
SAIL_REWARD_MIN=10
SAIL_REWARD_MAX=100
TREASURE_REWARD_MIN=1000
TREASURE_REWARD_MAX=10000
ADMIN_TOKEN=generate-a-strong-random
\`\`\`

## 2) Install & Build
\`\`\`
pnpm install
pnpm build
pnpm start -p 3000
\`\`\`

## 3) Healthcheck
`GET /api/health` → `{ ok: true }`

## 4) Persistent Storage
- Uses SQLite (`better-sqlite3`). Ensure the server has write permissions to `DB_PATH`.
- For serverless hosts without SQLite support, switch to Postgres + Prisma/Drizzle; mirror the current schema:
  - `balances(player_id TEXT PRIMARY KEY, amount INTEGER NOT NULL)`
  - `reward_events(id INTEGER PK, player_id TEXT, kind TEXT, amount INTEGER, created_at INTEGER, ip TEXT, rejected INTEGER)`
  - `users(id TEXT PK, email TEXT UNIQUE, password_hash TEXT, password_salt TEXT, created_at INTEGER)`
  - `sessions(token TEXT PK, user_id TEXT, created_at INTEGER, expires_at INTEGER)`

## 5) Admin Metrics
- Dashboard: `/admin/metrics`
- API: `GET /api/admin/metrics?token=ADMIN_TOKEN&days=7`
- Shows per-day earned/rejected/events and top players.

## 6) Security Notes
- Keep `ADMIN_TOKEN` secret (set via env, not hardcoded).
- Sessions use HTTP-only cookies. Consider adding CSRF protection if you expand account features.
- Reward endpoints are **server-authoritative**; clients only send `kind`.

## 7) Production Tips
- Run with Node 20+.
- Set `NODE_ENV=production`.
- Make regular DB backups (copy the SQLite file while the app is stopped).
- Consider rotating `ADMIN_TOKEN` periodically.
- Expose only necessary ports; put a reverse proxy in front (NGINX) with TLS.
