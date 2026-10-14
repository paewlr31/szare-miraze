import * as fileStore from "@/lib/store-file";
import type { SmsLog } from "@/lib/types";

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function db() {
  if (!databaseConfigured()) return fileStore;
  const { ensureSchema } = await import("@/lib/db");
  const sqlStore = await import("@/lib/store-sql");
  await ensureSchema();
  return sqlStore;
}

export async function listBlocked() {
  return (await db()).listBlocked();
}

export async function listBookings() {
  return (await db()).listBookings();
}

export async function createBooking(input: {
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
}) {
  return (await db()).createBooking(input);
}

export async function rejectBooking(id: string) {
  return (await db()).rejectBooking(id);
}

export async function rejectBookingByToken(token: string) {
  return (await db()).rejectBookingByToken(token);
}

export async function getBooking(id: string) {
  return (await db()).getBooking(id);
}

export async function getBookingByToken(token: string) {
  return (await db()).getBookingByToken(token);
}

export async function setOwnerSms(id: string, sms: SmsLog) {
  return (await db()).setOwnerSms(id, sms);
}

export async function setGuestSms(id: string, sms: SmsLog) {
  return (await db()).setGuestSms(id, sms);
}

export async function setGuestConfirmSms(id: string, sms: SmsLog) {
  return (await db()).setGuestConfirmSms(id, sms);
}
