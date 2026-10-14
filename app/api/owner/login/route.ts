import { NextResponse } from "next/server";
import { attachSession, pinMatches } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.OWNER_PIN) {
    return NextResponse.json(
      { ok: false, error: "Panel nie jest skonfigurowany. Ustaw OWNER_PIN w .env.local." },
      { status: 500 },
    );
  }
  if (!rateLimit(`login:${clientIp(request)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Za dużo prób logowania. Odczekaj 15 minut." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!pinMatches(pin)) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowy kod." }, { status: 401 });
  }
  return attachSession(NextResponse.json({ ok: true }));
}
