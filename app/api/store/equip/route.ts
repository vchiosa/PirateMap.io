import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import { equipCosmetic } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromCookies();
    const body = await req.json();
    const { playerId, itemId } = body || {};
    const effectiveId = user ? user.id : playerId;
    if (!effectiveId || !itemId) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const ok = equipCosmetic(effectiveId, itemId);
    if (!ok) return NextResponse.json({ success: false }, { status: 200 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
