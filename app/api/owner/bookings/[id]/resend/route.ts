import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { notifyGuestOfBooking, notifyGuestOfRejection, notifyOwner } from "@/lib/notify";
import { getBooking } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { target?: unknown } | null;
  const target =
    body?.target === "owner" || body?.target === "guest" || body?.target === "confirm" ? body.target : null;
  if (!target) {
    return NextResponse.json({ ok: false, error: "Wskaż odbiorcę SMS-a." }, { status: 400 });
  }

  try {
    const booking = await getBooking(id);
    if (!booking) {
      return NextResponse.json({ ok: false, error: "Nie ma takiej rezerwacji." }, { status: 404 });
    }
    if (target === "guest" && booking.status !== "rejected") {
      return NextResponse.json(
        { ok: false, error: "SMS o odmowie można wysłać po odrzuceniu terminu." },
        { status: 409 },
      );
    }

    const sms =
      target === "owner"
        ? await notifyOwner(booking)
        : target === "confirm"
          ? await notifyGuestOfBooking(booking)
          : await notifyGuestOfRejection(booking);
    return NextResponse.json({
      ok: true,
      smsOk: sms.status === "sent",
      smsError: sms.status === "failed" ? sms.error : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Nie udało się wysłać SMS-a." }, { status: 500 });
  }
}
