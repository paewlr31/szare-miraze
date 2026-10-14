import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ownerSmsPhone, smsConfigured, smsProviderName } from "@/lib/config";
import { formatPhone } from "@/lib/phone";
import { listBookings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try {
    const bookings = await listBookings();
    return NextResponse.json({
      ok: true,
      bookings,
      sms: {
        configured: smsConfigured(),
        provider: smsProviderName(),
        ownerPhone: formatPhone(ownerSmsPhone()),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nie udało się odczytać rezerwacji." },
      { status: 500 },
    );
  }
}
