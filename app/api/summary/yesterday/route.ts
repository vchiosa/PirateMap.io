import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import { dayStartUTC, computeConsecutiveStreak, markStreakClaim, hasClaim } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerIdParam = searchParams.get("playerId") || undefined;
    const user = await getUserFromCookies();
    const playerId = user ? user.id : playerIdParam;
    if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

    const now = Date.now();
    const today = dayStartUTC(now);
    const yStart = today - 86400_000;
    const yEnd = today;

    const earnedRow = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as s FROM reward_events
      WHERE player_id = ? AND rejected = 0 AND created_at >= ? AND created_at < ?
    `).get(playerId, yStart, yEnd) as any;
    const earned = Number(earnedRow?.s ?? 0);

    const questsRow = db.prepare(`
      SELECT COUNT(*) as c FROM reward_events
      WHERE player_id = ? AND kind = 'quest' AND rejected = 0 AND created_at >= ? AND created_at < ?
    `).get(playerId, yStart, yEnd) as any;
    const questsCompleted = Number(questsRow?.c ?? 0);

    const sailsRow = db.prepare(`
      SELECT COUNT(*) as c FROM reward_events
      WHERE player_id = ? AND kind = 'sail' AND rejected = 0 AND created_at >= ? AND created_at < ?
    `).get(playerId, yStart, yEnd) as any;
    const sails = Number(sailsRow?.c ?? 0);

    const trezRow = db.prepare(`
      SELECT COUNT(*) as c FROM reward_events
      WHERE player_id = ? AND kind = 'treasure' AND rejected = 0 AND created_at >= ? AND created_at < ?
    `).get(playerId, yStart, yEnd) as any;
    const treasures = Number(trezRow?.c ?? 0);

    // Streak and rewards
    const streak = computeConsecutiveStreak(playerId, now);
    const newRewards: string[] = [];

    if (streak >= 3 && !hasClaim(playerId, "day3")) {
      markStreakClaim(playerId, "day3", now);
      newRewards.push("Unlocked: Pirate Hat cosmetic for your ship!");
    }
    if (streak >= 7 && !hasClaim(playerId, "day7")) {
      markStreakClaim(playerId, "day7", now);
      newRewards.push("Weekly streak reward: Next treasure is doubled!");
      // Record a lightweight flag in balances via zero-amount event with reason
      db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, 'info', 0, ?, '', 0, ?)")
        .run(playerId, now, "double_treasure_next");
    }

    return NextResponse.json({
      date: new Date(yStart).toISOString().slice(0,10),
      earned, sails, treasures, questsCompleted, streak, newRewards
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
