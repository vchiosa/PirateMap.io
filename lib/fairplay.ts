import db from "@/lib/db";

export function sailsInWindow(playerId: string, ms: number): number {
  const now = Date.now();
  const row = db.prepare(`SELECT COUNT(*) as c FROM reward_events WHERE player_id = ? AND kind = 'sail' AND rejected = 0 AND created_at >= ?`)
    .get(playerId, now - ms) as any;
  return Number(row?.c ?? 0);
}

export function tooManySails(playerId: string): boolean {
  // Hard guard: > 90 sails in the last 60s is suspicious.
  return sailsInWindow(playerId, 60_000) > 90;
}

export function flagCheater(playerId: string, reason: string, severity = 1) {
  try {
    db.prepare("INSERT INTO cheater_flags(player_id, reason, severity, created_at) VALUES(?,?,?,?)").run(playerId, reason, severity, Date.now());
  } catch {}
}
