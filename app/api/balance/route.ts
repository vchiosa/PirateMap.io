import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getUserFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const user = await getUserFromCookies();
  const effectiveId = user ? user.id : playerId;
  if (!effectiveId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }
  const row = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId);
  return NextResponse.json({ balance: row?.amount ?? 0 });
}
