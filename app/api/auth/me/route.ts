import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
