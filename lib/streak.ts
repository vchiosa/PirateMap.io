import db from "@/lib/db";

export function dayStartUTC(t: number) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export function computeConsecutiveStreak(playerId: string, now: number = Date.now()): number {
  // Count consecutive days up to and including today if there's activity today,
  // otherwise up to yesterday.
  const todayStart = dayStartUTC(now);
  const days: number[] = [];
  const fourteenDaysAgo = todayStart - 14 * 86400_000;

  const rows = db.prepare(`
    SELECT DISTINCT (created_at - created_at % 86400000) as d
    FROM reward_events
    WHERE player_id = ? AND rejected = 0 AND created_at >= ?
    ORDER BY d DESC
  `).all(playerId, fourteenDaysAgo) as any[];
  for (const r of rows) days.push(Number(r.d));

  // Build a set for fast lookup
  const set = new Set(days);
  // Determine starting day: if today has activity, start at today; else at yesterday
  let start = set.has(todayStart) ? todayStart : todayStart - 86400_000;

  let streak = 0;
  for (;;) {
    if (set.has(start)) {
      streak += 1;
      start -= 86400_000;
    } else {
      break;
    }
  }
  return streak;
}

export function markStreakClaim(playerId: string, key: string, when: number) {
  const stmt = db.prepare(`
    INSERT INTO streak_claims(player_id, key, claimed_at) VALUES(?, ?, ?)
    ON CONFLICT(player_id, key) DO NOTHING
  `);
  try { stmt.run(playerId, key, when); } catch {}
}

export function hasClaim(playerId: string, key: string): boolean {
  const row = db.prepare(`SELECT 1 FROM streak_claims WHERE player_id = ? AND key = ?`).get(playerId, key) as any;
  return !!row;
}
