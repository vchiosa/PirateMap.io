import db from "@/lib/db";

export type Quest = {
  key: "sail_tiles" | "find_treasures" | "earn_gold";
  label: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
};

export function dayStartUTC(t: number) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export function ensureDailyQuests(playerId: string, now: number = Date.now()): Quest[] {
  const start = dayStartUTC(now);

  const defs: Omit<Quest, "progress" | "completed">[] = [
    { key: "sail_tiles", label: "Sail 20 tiles", target: 20, reward: 300 },
    { key: "find_treasures", label: "Find 1 treasure", target: 1, reward: 1000 },
    { key: "earn_gold", label: "Earn 2000 gold", target: 2000, reward: 500 },
  ];

  const up = db.prepare(`
    INSERT INTO daily_quests(player_id, date_utc, key, target, progress, reward, completed)
    VALUES(?, ?, ?, ?, 0, ?, 0)
    ON CONFLICT(player_id, date_utc, key) DO NOTHING
  `);

  for (const d of defs) {
    try { up.run(playerId, start, d.key, d.target, d.reward); } catch {}
  }

  const rows = db.prepare(`
    SELECT key, target, progress, reward, completed FROM daily_quests
    WHERE player_id = ? AND date_utc = ?
  `).all(playerId, start) as any[];

  // Backfill progress from reward_events (idempotent)
  const sailCount = (db.prepare(`
    SELECT COUNT(*) as c FROM reward_events
    WHERE player_id = ? AND kind = 'sail' AND rejected = 0 AND created_at >= ?
  `).get(playerId, start) as any)?.c ?? 0;

  const trezCount = (db.prepare(`
    SELECT COUNT(*) as c FROM reward_events
    WHERE player_id = ? AND kind = 'treasure' AND rejected = 0 AND created_at >= ?
  `).get(playerId, start) as any)?.c ?? 0;

  const goldSum = (db.prepare(`
    SELECT COALESCE(SUM(amount),0) as s FROM reward_events
    WHERE player_id = ? AND rejected = 0 AND created_at >= ?
  `).get(playerId, start) as any)?.s ?? 0;

  const progByKey: Record<string, number> = {
    sail_tiles: Number(sailCount),
    find_treasures: Number(trezCount),
    earn_gold: Number(goldSum),
  };

  const upd = db.prepare(`
    UPDATE daily_quests SET progress = MIN(target, ?)
    WHERE player_id = ? AND date_utc = ? AND key = ?
  `);

  for (const r of rows) {
    const p = progByKey[r.key] ?? 0;
    try { upd.run(p, playerId, start, r.key); } catch {}
  }

  const out = db.prepare(`
    SELECT key, target, progress, reward, completed FROM daily_quests
    WHERE player_id = ? AND date_utc = ? ORDER BY key
  `).all(playerId, start) as any[];

  return out.map(r => ({
    key: r.key,
    label: r.key === "sail_tiles" ? "Sail 20 tiles" : r.key === "find_treasures" ? "Find 1 treasure" : "Earn 2000 gold",
    target: Number(r.target),
    progress: Number(r.progress),
    reward: Number(r.reward),
    completed: !!r.completed,
  }));
}

export function applyProgress(playerId: string, kind: "sail" | "treasure", goldDelta: number, now: number, grantBonuses = true) {
  const start = dayStartUTC(now);
  // increment progress
  const inc = db.prepare(`
    UPDATE daily_quests SET progress = MIN(target, progress + ?)
    WHERE player_id = ? AND date_utc = ? AND key = ?
  `);
  if (kind === "sail") inc.run(1, playerId, start, "sail_tiles");
  if (kind === "treasure") inc.run(1, playerId, start, "find_treasures");
  inc.run(goldDelta, playerId, start, "earn_gold");

  // award newly completed quests
  if (!grantBonuses) return { bonuses: [] as {key:string, reward:number}[] };
  const rows = db.prepare(`
    SELECT key, target, progress, reward, completed FROM daily_quests
    WHERE player_id = ? AND date_utc = ?
  `).all(playerId, start) as any[];
  const toComplete = rows.filter(r => !r.completed && Number(r.progress) >= Number(r.target));

  const setCompleted = db.prepare(`
    UPDATE daily_quests SET completed = 1 WHERE player_id = ? AND date_utc = ? AND key = ?
  `);

  const bonuses: {key:string, reward:number}[] = [];
  for (const r of toComplete) {
    setCompleted.run(playerId, start, r.key);
    bonuses.push({ key: r.key, reward: Number(r.reward) });
  }
  return { bonuses };
}
