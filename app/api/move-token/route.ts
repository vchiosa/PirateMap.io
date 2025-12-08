import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import { signMoveToken } from "@/lib/move-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { q, r, playerId } = await req.json();
    const user = await getUserFromCookies();
    const effectiveId = user ? user.id : playerId;
    if (!effectiveId || typeof q !== "number" || typeof r !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const exp = Date.now() + 30_000; // 30s validity
    const token = signMoveToken({ playerId: effectiveId, q, r, exp });
    return NextResponse.json({ token, exp });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
