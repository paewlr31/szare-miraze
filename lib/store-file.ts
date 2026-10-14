import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { overlaps, stayError } from "@/lib/dates";
import { nationalPhone } from "@/lib/phone";
import { isCancelToken, newCancelToken } from "@/lib/token";
import type { BlockedStay, Booking, CreateResult, RejectResult, SmsLog } from "@/lib/types";

type Database = { bookings: Booking[] };

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function databasePath(): string {
  return process.env.BOOKINGS_PATH || path.join(process.cwd(), "data", "bookings.json");
}

function normalize(booking: Booking): Booking {
  return {
    ...booking,
    cancelToken: booking.cancelToken || "",
    ownerSms: booking.ownerSms ?? { status: "pending" },
  };
}

async function readDatabase(): Promise<Database> {
  try {
    const raw = await readFile(databasePath(), "utf8");
    const parsed = JSON.parse(raw) as { bookings?: unknown };
    if (!parsed || !Array.isArray(parsed.bookings)) {
      throw new Error("Plik rezerwacji jest uszkodzony.");
    }
    return { bookings: (parsed.bookings as Booking[]).map(normalize) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { bookings: [] };
    throw error;
  }
}

async function writeDatabase(data: Database): Promise<void> {
  const file = databasePath();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const handle = await open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2));
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(tmp, file);
  } catch {
    await rm(file, { force: true });
    await rename(tmp, file);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export async function listBlocked(): Promise<BlockedStay[]> {
  const data = await readDatabase();
  return data.bookings
    .filter((booking) => booking.status === "pending" && booking.checkIn && booking.checkOut)
    .map((booking) => ({ checkIn: booking.checkIn, checkOut: booking.checkOut }));
}

export async function listBookings(): Promise<Booking[]> {
  const data = await readDatabase();
  return clone(data.bookings).sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt));
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

  return withLock(async () => {
    const data = await readDatabase();
    const duplicate = data.bookings.find(
      (booking) =>
        booking.status === "pending" &&
        booking.guestPhone === phone &&
        booking.checkIn === input.checkIn &&
        booking.checkOut === input.checkOut,
    );
    if (duplicate) return { ok: true, booking: clone(duplicate), duplicate: true };

    const pendingForPhone = data.bookings.filter(
      (booking) => booking.status === "pending" && booking.guestPhone === phone,
    ).length;
    if (pendingForPhone >= 3) {
      return { ok: false, error: "Ten numer ma już 3 oczekujące rezerwacje.", status: 429 };
    }

    const clash = data.bookings.some(
      (booking) =>
        booking.status === "pending" && overlaps(input.checkIn, input.checkOut, booking.checkIn, booking.checkOut),
    );
    if (clash) return { ok: false, error: "Ten termin jest już zajęty.", status: 409 };

    const booking: Booking = {
      id: randomUUID(),
      guestName: input.guestName,
      guestPhone: phone,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "pending",
      cancelToken: newCancelToken(),
      createdAt: new Date().toISOString(),
      ownerSms: { status: "pending" },
      guestConfirmSms: { status: "pending" },
    };
    data.bookings.push(booking);
    await writeDatabase(data);
    return { ok: true, booking: clone(booking), duplicate: false };
  });
}

async function markRejected(matches: (booking: Booking) => boolean): Promise<RejectResult> {
  return withLock(async () => {
    const data = await readDatabase();
    const booking = data.bookings.find(matches);
    if (!booking) return { ok: false, error: "Nie ma takiej rezerwacji.", status: 404 };
    if (booking.status === "rejected") {
      return { ok: false, error: "Ta rezerwacja jest już anulowana.", status: 409 };
    }
    booking.status = "rejected";
    booking.rejectedAt = new Date().toISOString();
    booking.guestSms = { status: "pending" };
    await writeDatabase(data);
    return { ok: true, booking: clone(booking) };
  });
}

export function rejectBooking(id: string): Promise<RejectResult> {
  return markRejected((booking) => booking.id === id);
}

export function rejectBookingByToken(token: string): Promise<RejectResult> {
  if (!isCancelToken(token)) return Promise.resolve({ ok: false, error: "Nie ma takiej rezerwacji.", status: 404 });
  return markRejected((booking) => booking.cancelToken === token);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const data = await readDatabase();
  const booking = data.bookings.find((item) => item.id === id);
  return booking ? clone(booking) : null;
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  if (!isCancelToken(token)) return null;
  const data = await readDatabase();
  const booking = data.bookings.find((item) => item.cancelToken === token);
  return booking ? clone(booking) : null;
}

async function patchBooking(id: string, patch: (booking: Booking) => void): Promise<Booking | null> {
  return withLock(async () => {
    const data = await readDatabase();
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking) return null;
    patch(booking);
    await writeDatabase(data);
    return clone(booking);
  });
}

export function setOwnerSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return patchBooking(id, (booking) => {
    booking.ownerSms = sms;
  });
}

export function setGuestSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return patchBooking(id, (booking) => {
    booking.guestSms = sms;
  });
}

export function setGuestConfirmSms(id: string, sms: SmsLog): Promise<Booking | null> {
  return patchBooking(id, (booking) => {
    booking.guestConfirmSms = sms;
  });
}
