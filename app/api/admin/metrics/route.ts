import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayStartUTC(ts: number) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const days = Number(url.searchParams.get("days") ?? 7);
  const start = dayStartUTC(now - days * 86400000);

  // Per-day totals
  const rows = db.prepare(`
    SELECT created_at, amount, rejected FROM reward_events WHERE created_at >= ?
  `).all(start) as any[];

  const series: Record<number, { earned: number; rejected: number; events: number }> = {};
  for (let i = 0; i <= days; i++) {
    const day = dayStartUTC(now - i * 86400000);
    series[day] = { earned: 0, rejected: 0, events: 0 };
  }
  for (const r of rows) {
    const d = dayStartUTC(Number(r.created_at));
    if (!series[d]) series[d] = { earned: 0, rejected: 0, events: 0 };
    series[d].events += 1;
    if (Number(r.rejected)) series[d].rejected += 1;
    else series[d].earned += Number(r.amount);
  }

  const daily = Object.keys(series).map(k => ({
    day: Number(k),
    earned: series[Number(k)].earned,
    rejected: series[Number(k)].rejected,
    events: series[Number(k)].events,
  })).sort((a, b) => a.day - b.day);

  // Top players (by balance)
  const top = db.prepare(`
    SELECT player_id, amount FROM balances ORDER BY amount DESC LIMIT 20
  `).all() as any[];

  
  // Reason breakdown for rejections (today)
  const todayStart = dayStartUTC(Date.now());
  const reasons = db.prepare(`
    SELECT reason, COUNT(*) as c FROM reward_events
    WHERE rejected = 1 AND created_at >= ?
    GROUP BY reason
  `).all(todayStart) as any[];
  const reasonCounts = Object.fromEntries(reasons.map(r => [r.reason || "unknown", Number(r.c)]));

  return NextResponse.json({ daily, top, reasonCounts });

}
