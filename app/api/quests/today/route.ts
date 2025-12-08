import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import { ensureDailyQuests } from "@/lib/quests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") || undefined;
    const user = await getUserFromCookies();
    const effectiveId = user ? user.id : playerId;
    if (!effectiveId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

    const quests = ensureDailyQuests(effectiveId);
    return NextResponse.json({ quests });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
