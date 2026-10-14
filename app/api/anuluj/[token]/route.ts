import { NextResponse } from "next/server";
import { notifyGuestOfRejection } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getBookingByToken, rejectBookingByToken } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: Context) {
  if (!rateLimit(`cancel:${clientIp(request)}`, 12, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Za dużo prób. Spróbuj za chwilę." }, { status: 429 });
  }

  const { token } = await context.params;
  try {
    const rejected = await rejectBookingByToken(token);
    if (!rejected.ok && rejected.status !== 409) {
      return NextResponse.json({ ok: false, error: rejected.error }, { status: rejected.status });
    }

    const booking = rejected.ok ? rejected.booking : await getBookingByToken(token);
    if (!booking) {
      return NextResponse.json({ ok: false, error: "Nie ma takiej rezerwacji." }, { status: 404 });
    }
    if (booking.guestSms?.status === "sent") {
      return NextResponse.json({ ok: true, freed: true, already: !rejected.ok, smsOk: true });
    }

    const sms = await notifyGuestOfRejection(booking);
    return NextResponse.json({
      ok: true,
      freed: true,
      already: !rejected.ok,
      smsOk: sms.status === "sent",
      smsError: sms.status === "failed" ? sms.error : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Nie udało się anulować terminu." }, { status: 500 });
  }
}
