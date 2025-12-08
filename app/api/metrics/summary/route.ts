import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayStartUTC(ts: number) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}
function todayStartUTC() { return dayStartUTC(Date.now()); }

export async function GET(req: NextRequest) {
  const user = await getUserFromCookies();
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const effectiveId = user ? user.id : playerId;
  if (!effectiveId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const start = todayStartUTC();

  const today = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN rejected = 0 THEN amount ELSE 0 END), 0) as earned,
      SUM(CASE WHEN kind = 'sail' AND rejected = 0 THEN 1 ELSE 0 END) as sailCount,
      SUM(CASE WHEN kind = 'treasure' AND rejected = 0 THEN 1 ELSE 0 END) as treasureCount
    FROM reward_events WHERE player_id = ? AND created_at >= ?
  `).get(effectiveId, start) as any;

  const cap = Number(process.env.DAILY_CAP ?? 25000);

  // Streak: count consecutive days with any (non-rejected) event, starting today
  const daysBack = 30;
  const events = db.prepare(`
    SELECT created_at FROM reward_events 
    WHERE player_id = ? AND rejected = 0 
      AND created_at >= ?
    ORDER BY created_at DESC
  `).all(effectiveId, start - daysBack * 86400000) as any[];

  const daysWithEvents = new Set<number>();
  for (const e of events) {
    const ds = dayStartUTC(Number(e.created_at));
    daysWithEvents.add(ds);
  }
  let streak = 0;
  for (let i = 0; i <= daysBack; i++) {
    const day = start - i * 86400000;
    if (daysWithEvents.has(day)) streak++;
    else break;
  }

  return NextResponse.json({
    earnedToday: Number(today?.earned ?? 0),
    sailCount: Number(today?.sailCount ?? 0),
    treasureCount: Number(today?.treasureCount ?? 0),
    cap,
    streak
  });
}
