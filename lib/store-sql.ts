import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { stayError } from "@/lib/dates";
import { getPool, withTransaction } from "@/lib/db";
import { nationalPhone } from "@/lib/phone";
import { isCancelToken, newCancelToken } from "@/lib/token";
import type { BlockedStay, Booking, CreateResult, RejectResult, SmsLog } from "@/lib/types";

type Row = QueryResultRow & {
  id: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  status: Booking["status"];
  cancel_token: string;
  created_at: Date | string;
  rejected_at: Date | string | null;
  owner_sms: SmsLog;
  guest_sms: SmsLog | null;
  guest_confirm_sms: SmsLog | null;
};

function toBooking(row: Row): Booking {
  return {
    id: row.id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    checkIn: String(row.check_in).slice(0, 10),
    checkOut: String(row.check_out).slice(0, 10),
    status: row.status,
    cancelToken: row.cancel_token,
    createdAt: new Date(row.created_at).toISOString(),
    rejectedAt: row.rejected_at ? new Date(row.rejected_at).toISOString() : undefined,
    ownerSms: row.owner_sms,
    guestSms: row.guest_sms ?? undefined,
    guestConfirmSms: row.guest_confirm_sms ?? undefined,
  };
}

const pendingSms = JSON.stringify({ status: "pending" });

export async function listBlocked(): Promise<BlockedStay[]> {
  const result = await getPool().query<Row>(
    `SELECT check_in, check_out FROM bookings WHERE status = 'pending' ORDER BY check_in`,
  );
  return result.rows.map((row) => ({
    checkIn: String(row.check_in).slice(0, 10),
    checkOut: String(row.check_out).slice(0, 10),
  }));
}

export async function listBookings(): Promise<Booking[]> {
  const result = await getPool().query<Row>(`SELECT * FROM bookings ORDER BY check_in, created_at`);
  return result.rows.map(toBooking);
}

export async function createBooking(input: {
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
}): Promise<CreateResult> {
  const phone = nationalPhone(input.guestPhone);
  if (!phone) return { ok: false, error: "Podaj prawidłowy numer telefonu.", status: 400 };
  const dateError = stayError(input.checkIn, input.checkOut);
  if (dateError) return { ok: false, error: dateError, status: 400 };

  return withTransaction(async (client) => {
    const duplicate = await client.query<Row>(
      `SELECT * FROM bookings
       WHERE status = 'pending' AND guest_phone = $1 AND check_in = $2 AND check_out = $3
       LIMIT 1`,
      [phone, input.checkIn, input.checkOut],
    );
    if (duplicate.rows[0]) return { ok: true, booking: toBooking(duplicate.rows[0]), duplicate: true };

    const count = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM bookings WHERE status = 'pending' AND guest_phone = $1`,
      [phone],
    );
    if (Number(count.rows[0]?.n ?? 0) >= 3) {
      return { ok: false, error: "Ten numer ma już 3 oczekujące rezerwacje.", status: 429 };
    }

    const clash = await client.query(
      `SELECT 1 FROM bookings
       WHERE status = 'pending' AND check_in < $2 AND $1 < check_out
       LIMIT 1`,
      [input.checkIn, input.checkOut],
    );
    if (clash.rows.length > 0) return { ok: false, error: "Ten termin jest już zajęty.", status: 409 };

    const inserted = await client.query<Row>(
      `INSERT INTO bookings (
         id, guest_name, guest_phone, check_in, check_out, status, cancel_token, owner_sms, guest_confirm_sms
       ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7::jsonb, $8::jsonb)
       RETURNING *`,
      [
        randomUUID(),
        input.guestName,
        phone,
        input.checkIn,
        input.checkOut,
        newCancelToken(),
        pendingSms,
        pendingSms,
      ],
    );
    return { ok: true, booking: toBooking(inserted.rows[0]), duplicate: false };
  });
}

async function rejectMatch(column: "id" | "cancel_token", value: string): Promise<RejectResult> {
  return withTransaction(async (client) => {
    const found = await client.query<Row>(`SELECT * FROM bookings WHERE ${column} = $1 FOR UPDATE`, [value]);
    const booking = found.rows[0];
    if (!booking) return { ok: false, error: "Nie ma takiej rezerwacji.", status: 404 };
    if (booking.status === "rejected") {
      return { ok: false, error: "Ta rezerwacja jest już anulowana.", status: 409 };
    }
    const updated = await client.query<Row>(
      `UPDATE bookings
       SET status = 'rejected', rejected_at = now(), guest_sms = $2::jsonb
       WHERE ${column} = $1
       RETURNING *`,
      [value, pendingSms],
    );
    return { ok: true, booking: toBooking(updated.rows[0]) };
  });
}

export function rejectBooking(id: string): Promise<RejectResult> {
  return rejectMatch("id", id);
}

export function rejectBookingByToken(token: string): Promise<RejectResult> {
  if (!isCancelToken(token)) return Promise.resolve({ ok: false, error: "Nie ma takiej rezerwacji.", status: 404 });
  return rejectMatch("cancel_token", token);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const result = await getPool().query<Row>(`SELECT * FROM bookings WHERE id = $1`, [id]);
  return result.rows[0] ? toBooking(result.rows[0]) : null;
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  if (!isCancelToken(token)) return null;
  const result = await getPool().query<Row>(`SELECT * FROM bookings WHERE cancel_token = $1`, [token]);
  return result.rows[0] ? toBooking(result.rows[0]) : null;
}

async function setSms(id: string, column: "owner_sms" | "guest_sms" | "guest_confirm_sms", sms: SmsLog): Promise<Booking | null> {
  const result = await getPool().query<Row>(`UPDATE bookings SET ${column} = $2::jsonb WHERE id = $1 RETURNING *`, [
    id,
    JSON.stringify(sms),
  ]);
  return result.rows[0] ? toBooking(result.rows[0]) : null;
}

export function setOwnerSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return setSms(id, "owner_sms", sms);
}

export function setGuestSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return setSms(id, "guest_sms", sms);
}

export function setGuestConfirmSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return setSms(id, "guest_confirm_sms", sms);
}
