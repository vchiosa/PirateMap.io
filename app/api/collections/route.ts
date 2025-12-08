import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import { hasSpiceSet } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerIdParam = searchParams.get("playerId") || undefined;
    const user = await getUserFromCookies();
    const playerId = user ? user.id : playerIdParam;
    if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

    const rows = db.prepare("SELECT item_key, qty FROM player_collections WHERE player_id = ?").all(playerId) as any[];
    const items: Record<string, number> = {};
    for (const r of rows) items[r.item_key] = Number(r.qty);
    const spiceSet = hasSpiceSet(playerId);
    return NextResponse.json({ items, spiceSet });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
