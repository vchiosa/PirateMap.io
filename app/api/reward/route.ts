import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";
import { randomBytes } from "crypto";
import { verifyMoveToken, isNeighborAxial } from "@/lib/move-token";
import { applyProgress, ensureDailyQuests } from "@/lib/quests";
import { maybeDropCollectible, hasSpiceSet } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tunables (can move to env if you like)
const DAILY_CAP = Number(process.env.DAILY_CAP ?? 25000); // per player per UTC day
const COOLDOWN_MS = Number(process.env.REWARD_COOLDOWN_MS ?? 800);
const SAIL_MIN = Number(process.env.SAIL_REWARD_MIN ?? 10);
const SAIL_MAX = Number(process.env.SAIL_REWARD_MAX ?? 100);
const TREASURE_MIN = Number(process.env.TREASURE_REWARD_MIN ?? 1000);
const TREASURE_MAX = Number(process.env.TREASURE_REWARD_MAX ?? 10000);

async function verifyTurnstile(token?: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not enforced if not configured
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteip ?? "" })
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

function rngInt(min: number, max: number) {
  // crypto-strong uniform integer in [min, max]
  const span = max - min + 1;
  // 6 bytes entropy -> large enough; reduce bias via rejection sampling
  while (true) {
    const n = Number(BigInt("0x" + randomBytes(6).toString("hex")));
    const limit = Math.floor(0x1000000000000 / span) * span; // 2^48
    if (n < limit) return min + (n % span);
  }
}

function todayStartUTC() {
  const d = new Date();
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  return utc;
}


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
    const body = await req.json();
    const kind = body?.kind as ("sail" | "treasure" | undefined);
    const moveToken = body?.moveToken as (string | undefined);
    const captchaToken = body?.captchaToken as (string | undefined);
    const playerId = body?.playerId as (string | undefined);

    const user = await getUserFromCookies();
    const effectiveId = user ? user.id : playerId;

    if (!effectiveId || (kind !== "sail" && kind !== "treasure")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Validate move token
    const payload = verifyMoveToken(moveToken || "");
    if (!payload || payload.playerId !== effectiveId) {
      // Log rejected
      const now = Date.now();
      db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, ?, ?, ?, ?, 1, ?)")
        .run(effectiveId, kind, 0, now, ip, "invalid_token");
      const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
      return NextResponse.json({ success: true, amountGranted: 0, balance: balRow?.amount ?? 0, reason: "invalid_token" });
    }

    // Adjacency check (if we have a last position)
    const state = db.prepare("SELECT last_q, last_r FROM player_state WHERE player_id = ?").get(effectiveId) as any;
    if (state && state.last_q != null && state.last_r != null) {
      if (!isNeighborAxial(Number(state.last_q), Number(state.last_r), payload.q, payload.r)) {
        const now = Date.now();
        db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, ?, ?, ?, ?, 1, ?)")
          .run(effectiveId, kind, 0, now, ip, "not_adjacent");
        const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
        return NextResponse.json({ success: true, amountGranted: 0, balance: balRow?.amount ?? 0, reason: "not_adjacent" });
      }
    }

    // Cooldown
    const now = Date.now();
    const last = db.prepare("SELECT created_at FROM reward_events WHERE player_id = ? AND rejected = 0 ORDER BY created_at DESC LIMIT 1").get(effectiveId) as any;
    if (last && now - Number(last.created_at) < COOLDOWN_MS) {
      db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, ?, ?, ?, ?, 1, ?)")
        .run(effectiveId, kind, 0, now, ip, "cooldown");
      const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
      return NextResponse.json({ success: true, amountGranted: 0, balance: balRow?.amount ?? 0, reason: "cooldown" });
    }

    // Turnstile gating: require for treasure and every Nth sail
    const startUTC = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 0, 0, 0, 0);
    const sailRow = db.prepare("SELECT COUNT(*) as c FROM reward_events WHERE player_id = ? AND kind = 'sail' AND rejected = 0 AND created_at >= ?").get(effectiveId, startUTC) as any;
    const sailsToday = Number(sailRow?.c ?? 0);
    const needCaptcha = (kind === "treasure") || ((sailsToday + (kind === "sail" ? 1 : 0)) % 10 === 0);
    if (needCaptcha) {
      const ok = await verifyTurnstile(captchaToken, ip || undefined);
      if (!ok) {
        db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, ?, ?, ?, ?, 1, ?)")
          .run(effectiveId, kind, 0, now, ip, "captcha");
        const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
        return NextResponse.json({ success: true, amountGranted: 0, balance: balRow?.amount ?? 0, reason: "captcha" });
      }
    }

    // Daily cap
    const todaySum = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM reward_events WHERE player_id = ? AND created_at >= ? AND rejected = 0")
      .get(effectiveId, startUTC) as any;
    const todaySoFar = Number(todaySum?.s ?? 0);
    if (todaySoFar >= DAILY_CAP) {
      db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, ?, ?, ?, ?, 1, ?)")
        .run(effectiveId, kind, 0, now, ip, "cap");
      const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
      return NextResponse.json({ success: true, amountGranted: 0, balance: balRow?.amount ?? 0, reason: "cap" });
    }

    // Compute server-side amount
    const [min, max] = kind === "sail" ? [SAIL_MIN, SAIL_MAX] : [TREASURE_MIN, TREASURE_MAX];
    let grant = rngInt(min, max);
    // Collection bonus: spice+rum+ancient_map gives +10% on sails
    try {
      if (kind === "sail" && hasSpiceSet(effectiveId)) {
        grant = Math.floor(grant * 1.10);
      }
    } catch {}

    // One-time double treasure reward if flagged
    try {
      if (kind === "treasure") {
        const flag = db.prepare("SELECT rowid FROM reward_events WHERE player_id = ? AND reason = 'double_treasure_next' AND rejected = 0 ORDER BY created_at ASC LIMIT 1").get(effectiveId) as any;
        if (flag) {
          grant = grant * 2;
          db.prepare("DELETE FROM reward_events WHERE rowid = ?").run(flag.rowid);
        }
      }
    } catch {}


    // Trim to remaining cap if needed
    const remaining = DAILY_CAP - todaySoFar;
    if (grant > remaining) grant = remaining;

    // Persist event and add to balance
    db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected) VALUES (?, ?, ?, ?, ?, 0)")
      .run(effectiveId, kind, grant, now, ip);
    const upsert = db.prepare(`
      INSERT INTO balances(player_id, amount) VALUES(?, ?)
      ON CONFLICT(player_id) DO UPDATE SET amount = balances.amount + excluded.amount
    `);
    upsert.run(effectiveId, grant);

    // Update last position on successful sail
    if (kind === "sail") {
      db.prepare(`
        INSERT INTO player_state(player_id, last_q, last_r, updated_at) VALUES(?, ?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET last_q=excluded.last_q, last_r=excluded.last_r, updated_at=excluded.updated_at
      `).run(effectiveId, payload.q, payload.r, now);
    }

    const balRow = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
    
    // Quests & Collections hooks
    try {
      const { bonuses } = applyProgress(effectiveId, kind, grant, now, true);
      // pay out quest bonuses as separate reward_events and balance
      if (bonuses && bonuses.length) {
        for (const b of bonuses) {
          db.prepare("INSERT INTO reward_events (player_id, kind, amount, created_at, ip, rejected, reason) VALUES (?, 'quest', ?, ?, ?, 0, ?)")
            .run(effectiveId, b.reward, now, ip, b.key);
          db.prepare(`
            INSERT INTO balances(player_id, amount) VALUES(?, ?)
            ON CONFLICT(player_id) DO UPDATE SET amount = balances.amount + excluded.amount
          `).run(effectiveId, b.reward);
        }
      }
      // Collections: treasure drop chance
      let itemDrop: any = null;
      let setCompleted: any = null;
      if (kind === "treasure") {
        const res = maybeDropCollectible(effectiveId);
        if (res.dropped) itemDrop = res.dropped;
        if (res.setCompleted) setCompleted = res.setCompleted;
      }
      // Ensure quests exist for response
      const quests = ensureDailyQuests(effectiveId);
      // Re-query balance after possible quest bonuses
      const br2 = db.prepare("SELECT amount FROM balances WHERE player_id = ?").get(effectiveId) as any;
      return NextResponse.json({ success: true, amountGranted: grant, balance: br2?.amount ?? 0, todaySoFar: todaySoFar + grant, cap: DAILY_CAP, quests, itemDrop, setCompleted });
    } catch {
      // fall back to previous return
      return NextResponse.json({ success: true, amountGranted: grant, balance: balRow?.amount ?? 0, todaySoFar: todaySoFar + grant, cap: DAILY_CAP });
    }

  } catch (e) {
    console.error("authoritative reward error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
