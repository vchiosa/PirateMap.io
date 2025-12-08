import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import { seedCosmetics, listCosmetics, getInventory } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerIdParam = searchParams.get("playerId") || undefined;
    const user = await getUserFromCookies();
    const playerId = user ? user.id : playerIdParam;
    if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

    seedCosmetics();
    const items = listCosmetics();
    const inv = getInventory(playerId);
    const goldRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(playerId) as any;
    const coinsRow = db.prepare("SELECT amount FROM coins_balance WHERE player_id = ?").get(playerId) as any;
    const gold = Number(goldRow?.amount ?? 0);
    const coins = Number(coinsRow?.amount ?? 0);

    return NextResponse.json({ items, inventory: inv, gold, coins });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
