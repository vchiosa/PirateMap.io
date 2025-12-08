import db from "@/lib/db";

export type ItemKey = "spice" | "rum" | "ancient_map" | "idol" | "doubloon";

const ALL: ItemKey[] = ["spice", "rum", "ancient_map", "idol", "doubloon"];

export function maybeDropCollectible(playerId: string): { dropped?: ItemKey, setCompleted?: string } {
  // 35% drop chance on treasure
  if (Math.random() > 0.35) return {};
  const item = ALL[Math.floor(Math.random() * ALL.length)];
  const up = db.prepare(`
    INSERT INTO player_collections(player_id, item_key, qty) VALUES(?, ?, 1)
    ON CONFLICT(player_id, item_key) DO UPDATE SET qty = qty + 1
  `);
  try { up.run(playerId, item); } catch {}
  const hasSpice = getQty(playerId, "spice") > 0;
  const hasRum = getQty(playerId, "rum") > 0;
  const hasMap = getQty(playerId, "ancient_map") > 0;
  const setCompleted = (hasSpice && hasRum && hasMap) ? "spice_rum_map" : undefined;
  return { dropped: item, setCompleted };
}

export function getQty(playerId: string, item: ItemKey): number {
  const row = db.prepare(`SELECT qty FROM player_collections WHERE player_id = ? AND item_key = ?`).get(playerId, item) as any;
  return Number(row?.qty ?? 0);
}

export function hasSpiceSet(playerId: string): boolean {
  return getQty(playerId, "spice") > 0 && getQty(playerId, "rum") > 0 && getQty(playerId, "ancient_map") > 0;
}
