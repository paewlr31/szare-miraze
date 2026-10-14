import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { notifyGuestOfRejection } from "@/lib/notify";
import { rejectBooking } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await context.params;
  try {
    const rejected = await rejectBooking(id);
    if (!rejected.ok) {
      return NextResponse.json({ ok: false, error: rejected.error }, { status: rejected.status });
    }
    const sms = await notifyGuestOfRejection(rejected.booking);
    return NextResponse.json({
      ok: true,
      freed: true,
      smsOk: sms.status === "sent",
      smsError: sms.status === "failed" ? sms.error : undefined,
      booking: rejected.booking,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nie udało się odrzucić rezerwacji." },
      { status: 500 },
    );
  }
}
