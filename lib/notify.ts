import { ownerSmsPhone } from "@/lib/config";
import { guestConfirmation, guestRejection, ownerAlert } from "@/lib/messages";
import { sendSms } from "@/lib/sms";
import { setGuestConfirmSms, setGuestSms, setOwnerSms } from "@/lib/store";
import type { Booking, SmsLog } from "@/lib/types";

function logFromResult(result: { ok: true; id: string } | { ok: false; error: string }): SmsLog {
  if (result.ok) return { status: "sent", providerId: result.id, at: new Date().toISOString() };
  return { status: "failed", error: result.error, at: new Date().toISOString() };
}

export async function notifyOwner(booking: Booking): Promise<SmsLog> {
  const result = await sendSms(ownerSmsPhone(), ownerAlert(booking));
  const log = logFromResult(result);
  await setOwnerSms(booking.id, log);
  return log;
}

export async function notifyGuestOfBooking(booking: Booking): Promise<SmsLog> {
  const result = await sendSms(booking.guestPhone, guestConfirmation(booking));
  const log = logFromResult(result);
  await setGuestConfirmSms(booking.id, log);
  return log;
}

export async function notifyGuestOfRejection(booking: Booking): Promise<SmsLog> {
  const result = await sendSms(booking.guestPhone, guestRejection(booking));
  const log = logFromResult(result);
  await setGuestSms(booking.id, log);
  return log;
}
