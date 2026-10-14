import { NextResponse } from "next/server";
import { diffDays } from "@/lib/dates";
import { notifyGuestOfBooking, notifyOwner } from "@/lib/notify";
import { cleanName } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createBooking } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!rateLimit(`book:${clientIp(request)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Za dużo prób rezerwacji. Spróbuj za godzinę." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    guestName?: unknown;
    guestPhone?: unknown;
    checkIn?: unknown;
    checkOut?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "Niepełne dane rezerwacji." }, { status: 400 });
  }

  const guestName = typeof body.guestName === "string" ? cleanName(body.guestName) : null;
  if (!guestName) {
    return NextResponse.json(
      { ok: false, error: "Podaj imię i nazwisko." },
      { status: 400 },
    );
  }
  if (typeof body.guestPhone !== "string" || typeof body.checkIn !== "string" || typeof body.checkOut !== "string") {
    return NextResponse.json({ ok: false, error: "Uzupełnij telefon i daty." }, { status: 400 });
  }

  try {
    const created = await createBooking({
      guestName,
      guestPhone: body.guestPhone,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });
    if (!created.ok) {
      return NextResponse.json({ ok: false, error: created.error }, { status: created.status });
    }

    const ownerSms = created.duplicate ? created.booking.ownerSms : await notifyOwner(created.booking);
    const guestSms = created.duplicate
      ? created.booking.guestConfirmSms
      : await notifyGuestOfBooking(created.booking);
    return NextResponse.json({
      ok: true,
      duplicate: created.duplicate,
      ownerSmsOk: ownerSms.status === "sent",
      guestSmsOk: guestSms?.status === "sent",
      booking: {
        id: created.booking.id,
        guestName: created.booking.guestName,
        checkIn: created.booking.checkIn,
        checkOut: created.booking.checkOut,
        nights: diffDays(created.booking.checkIn, created.booking.checkOut),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nie udało się zapisać rezerwacji." },
      { status: 500 },
    );
  }
}
