import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, createSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || typeof email !== "string" || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const user = createUser(email, password);
    const { token, expiresAt } = createSession(user.id);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
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
