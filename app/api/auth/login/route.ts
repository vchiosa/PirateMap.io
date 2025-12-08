import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    const user = findUserByEmail(email);
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const { token, expiresAt } = createSession(user.id);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(expiresAt),
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
