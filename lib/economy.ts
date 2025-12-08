import db from "@/lib/db";

export type Cosmetic = {
  id: string;
  name: string;
  type: "hat" | "sail" | "hull";
  price_gold: number;
  price_coins: number;
};

export function seedCosmetics() {
  const items: Cosmetic[] = [
    { id: "hat_pirate", name: "Pirate Hat", type: "hat", price_gold: 1000, price_coins: 10 },
    { id: "sail_red", name: "Crimson Sail", type: "sail", price_gold: 1500, price_coins: 15 },
    { id: "hull_black", name: "Black Hull", type: "hull", price_gold: 2000, price_coins: 20 },
  ];
  const ins = db.prepare(`INSERT OR IGNORE INTO cosmetics(id, name, type, price_gold, price_coins) VALUES(?,?,?,?,?)`);
  for (const it of items) ins.run(it.id, it.name, it.type, it.price_gold, it.price_coins);
}

export function getGold(playerId: string): number {
  const r = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(playerId) as any;
  return Number(r?.amount ?? 0);
}

export function getCoins(playerId: string): number {
  const r = db.prepare("SELECT amount FROM coins_balance WHERE player_id = ?").get(playerId) as any;
  return Number(r?.amount ?? 0);
}

export function addCoins(playerId: string, delta: number) {
  const up = db.prepare(`
    INSERT INTO coins_balance(player_id, amount) VALUES(?, ?)
    ON CONFLICT(player_id) DO UPDATE SET amount = coins_balance.amount + excluded.amount
  `);
  up.run(playerId, delta);
}

export function deductCoins(playerId: string, amt: number): boolean {
  const bal = getCoins(playerId);
  if (bal < amt) return false;
  db.prepare("UPDATE coins_balance SET amount = amount - ? WHERE player_id = ?").run(amt, playerId);
  return true;
}

export function deductGold(playerId: string, amt: number): boolean {
  const bal = getGold(playerId);
  if (bal < amt) return false;
  db.prepare("UPDATE balances SET amount = amount - ? WHERE player_id = ?").run(amt, playerId);
  return true;
}

export function listCosmetics(): Cosmetic[] {
  return db.prepare("SELECT id, name, type, price_gold as price_gold, price_coins as price_coins FROM cosmetics").all() as any;
}

export function getInventory(playerId: string) {
  const rows = db.prepare("SELECT cosmetic_id, equipped FROM player_inventory WHERE player_id = ?").all(playerId) as any[];
  const equipped = rows.find(r => r.equipped)?.cosmetic_id || null;
  const owned = rows.map(r => r.cosmetic_id);
  return { equipped, owned };
}

export function equipCosmetic(playerId: string, cosmeticId: string) {
  const own = db.prepare("SELECT 1 FROM player_inventory WHERE player_id = ? AND cosmetic_id = ?").get(playerId, cosmeticId);
  if (!own) return false;
  db.prepare("UPDATE player_inventory SET equipped = 0 WHERE player_id = ?").run(playerId);
  db.prepare("UPDATE player_inventory SET equipped = 1 WHERE player_id = ? AND cosmetic_id = ?").run(playerId, cosmeticId);
  return true;
}

export function purchaseCosmetic(playerId: string, cosmeticId: string, currency: "gold"|"coins"): { ok: boolean; reason?: string } {
  const it = db.prepare("SELECT id, name, type, price_gold, price_coins FROM cosmetics WHERE id = ?").get(cosmeticId) as any;
  if (!it) return { ok: false, reason: "not_found" };
  const already = db.prepare("SELECT 1 FROM player_inventory WHERE player_id = ? AND cosmetic_id = ?").get(playerId, cosmeticId);
  if (already) return { ok: false, reason: "already_owned" };
  const price = currency === "gold" ? Number(it.price_gold) : Number(it.price_coins);
  if (price <= 0) return { ok: false, reason: "not_purchasable" };

  let ok = false;
  if (currency === "gold") ok = deductGold(playerId, price);
  else ok = deductCoins(playerId, price);

  if (!ok) return { ok: false, reason: "insufficient_funds" };

  db.prepare("INSERT INTO player_inventory(player_id, cosmetic_id, equipped) VALUES(?, ?, 0)").run(playerId, cosmeticId);
  db.prepare("INSERT INTO purchase_history(player_id, cosmetic_id, currency, amount, created_at) VALUES(?,?,?,?,?)")
    .run(playerId, cosmeticId, currency, price, Date.now());
  return { ok: true };
}
