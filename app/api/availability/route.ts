import { NextResponse } from "next/server";
import { listBlocked } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blocked = await listBlocked();
    return NextResponse.json(
      { ok: true, blocked },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nie udało się odczytać kalendarza." },
      { status: 500 },
    );
  }
}
