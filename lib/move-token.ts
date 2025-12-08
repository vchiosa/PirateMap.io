import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.MOVE_TOKEN_SECRET || process.env.AUTH_SECRET || "dev-secret-change-me";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function b64urlDecode(str: string) {
  str = str.replace(/-/g,"+").replace(/_/g,"/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

export type MovePayload = {
  playerId: string;
  q: number;
  r: number;
  kind?: "sail" | "treasure";
  exp: number; // ms since epoch
}

export function signMoveToken(payload: MovePayload): string {
  const json = JSON.stringify(payload);
  const body = b64url(Buffer.from(json));
  const sig = createHmac("sha256", SECRET).update(body).digest();
  return body + "." + b64url(sig);
}

export function verifyMoveToken(token: string): MovePayload | null {
  if (!token || token.indexOf(".") < 0) return null;
  const [bodyB64, sigB64] = token.split(".", 2);
  const expected = Buffer.from(createHmac("sha256", SECRET).update(bodyB64).digest());
  const got = b64urlDecode(sigB64);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(bodyB64).toString("utf-8")) as MovePayload;
    if (!payload.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isNeighborAxial(aq: number, ar: number, bq: number, br: number) {
  const dq = bq - aq;
  const dr = br - ar;
  const dirs = [
    [1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]
  ];
  return dirs.some(([x,y]) => x === dq && y === dr);
}
