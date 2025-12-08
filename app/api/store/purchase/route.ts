import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { purchaseCosmetic, equipCosmetic } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromCookies();
    const body = await req.json();
    const { playerId, itemId, currency, equip } = body || {};
    const effectiveId = user ? user.id : playerId;
    if (!effectiveId || !itemId || (currency !== "gold" && currency !== "coins")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const res = purchaseCosmetic(effectiveId, itemId, currency);
    if (!res.ok) {
      return NextResponse.json({ success: false, reason: res.reason || "purchase_failed" }, { status: 200 });
    }
    if (equip) {
      equipCosmetic(effectiveId, itemId);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
