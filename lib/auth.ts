import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import db from "@/lib/db";

const SESSION_COOKIE = "pm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

type User = { id: string; email: string };

function hashPassword(password: string, salt: string) {
  const buf = scryptSync(password, salt, 64);
  return buf.toString("hex");
}

export function createUser(email: string, password: string): User {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const id = randomBytes(16).toString("hex");
  const createdAt = Date.now();

  const stmt = db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)");
  stmt.run(id, email.toLowerCase(), hash, salt, createdAt);
  return { id, email: email.toLowerCase() };
}

export function findUserByEmail(email: string): (User & { password_hash: string; password_salt: string }) | null {
  const row = db.prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?").get(email.toLowerCase());
  return row ?? null;
}

export function verifyPassword(password: string, hashHex: string, salt: string): boolean {
  const hash = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSession(userId: string) {
  const token = randomBytes(24).toString("hex");
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(token, userId, createdAt, expiresAt);
  return { token, expiresAt };
}

export async function getUserFromCookies(): User | null {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const row = db.prepare("SELECT u.id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?").get(token);
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
      return null;
    }
    return { id: row.id, email: row.email };
  } catch {
    return null;
  }
}

export function setSessionCookie(resp: Response, token: string, expiresAt: number) {
  // NextResponse in route handlers has cookies API but to keep types simple we accept Response-like
  // We'll set cookie headers directly in the route code for clarity.
}

export function clearSessionToken(token: string | null) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export { SESSION_COOKIE };
