import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "sm_owner";
const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

function secret(): string {
  const value = process.env.OWNER_SECRET || process.env.OWNER_PIN;
  if (!value) throw new Error("Brak OWNER_SECRET.");
  return value;
}

export function pinMatches(input: string): boolean {
  const expected = process.env.OWNER_PIN ?? "";
  if (!expected) return false;
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken(): string {
  const payload = `v1.${Date.now() + FOURTEEN_DAYS * 1000}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function sessionValid(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expires, signature] = parts;
  const payload = `${version}.${expires}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  if (version !== "v1") return false;
  return Number(expires) > Date.now();
}

export function attachSession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FOURTEEN_DAYS,
  });
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function requireOwner(): Promise<NextResponse | null> {
  const jar = await cookies();
  if (sessionValid(jar.get(COOKIE)?.value)) return null;
  return NextResponse.json({ ok: false, error: "Zaloguj się do panelu." }, { status: 401 });
}
