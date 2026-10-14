import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { addDays, diffDays, nightsLabel, overlaps, stayError, warsawToday } from "../lib/dates";
import { nationalPhone } from "../lib/phone";

async function main() {
  const dir = await mkdtemp(path.join(tmpdir(), "szare-miraze-"));
  process.env.BOOKINGS_PATH = path.join(dir, "bookings.json");

  const { createBooking, listBlocked, rejectBookingByToken } = await import("../lib/store");

  const today = warsawToday();
  assert.equal(stayError(today, addDays(today, 2)), null);
  assert.match(stayError(addDays(today, -1), addDays(today, 2)) ?? "", /przeszłości/);
  assert.match(stayError("2026-02-31", "2026-03-02") ?? "", /prawidłowe/);
  assert.equal(overlaps("2026-10-10", "2026-10-12", "2026-10-12", "2026-10-14"), false);
  assert.equal(overlaps("2026-10-10", "2026-10-13", "2026-10-12", "2026-10-15"), true);
  assert.equal(nightsLabel(1), "1 noc");
  assert.equal(nightsLabel(3), "3 noce");
  assert.equal(nightsLabel(5), "5 nocy");
  assert.equal(nightsLabel(12), "12 nocy");
  assert.equal(nationalPhone("889 599 088"), "889599088");
  assert.equal(nationalPhone("+48 668 311 444"), "668311444");
  assert.equal(diffDays("2026-10-10", "2026-10-12"), 2);

  const start = addDays(today, 40);
  const end = addDays(start, 3);
  const next = addDays(end, 2);

  const first = await createBooking({
    guestName: "Anna Test",
    guestPhone: "500100200",
    checkIn: start,
    checkOut: end,
  });
  assert.equal(first.ok, true);

  const duplicate = await createBooking({
    guestName: "Anna Test",
    guestPhone: "500100200",
    checkIn: start,
    checkOut: end,
  });
  assert.equal(duplicate.ok && duplicate.duplicate, true);

  const clash = await createBooking({
    guestName: "Jan Inny",
    guestPhone: "500100201",
    checkIn: addDays(start, 1),
    checkOut: addDays(end, 1),
  });
  assert.equal(clash.ok, false);
  if (!clash.ok) assert.equal(clash.status, 409);

  const adjacent = await createBooking({
    guestName: "Ewa Obok",
    guestPhone: "500100202",
    checkIn: end,
    checkOut: next,
  });
  assert.equal(adjacent.ok, true);

  const sameNight = await Promise.all([
    createBooking({
      guestName: "Ola Raz",
      guestPhone: "500100203",
      checkIn: addDays(today, 80),
      checkOut: addDays(today, 82),
    }),
    createBooking({
      guestName: "Iga Dwa",
      guestPhone: "500100204",
      checkIn: addDays(today, 80),
      checkOut: addDays(today, 82),
    }),
  ]);
  assert.equal(sameNight.filter((result) => result.ok).length, 1);

  let blocked = await listBlocked();
  assert.equal(
    blocked.some((stay) => stay.checkIn === start && stay.checkOut === end),
    true,
  );

  if (!first.ok) throw new Error("brak pierwszej rezerwacji");
  if (first.booking.cancelToken.length < 20) throw new Error("brak linku anulowania");
  const rejected = await rejectBookingByToken(first.booking.cancelToken);
  assert.equal(rejected.ok, true);
  blocked = await listBlocked();
  assert.equal(
    blocked.some((stay) => stay.checkIn === start),
    false,
  );

  const again = await createBooking({
    guestName: "Anna Jeszcze",
    guestPhone: "500100205",
    checkIn: start,
    checkOut: end,
  });
  assert.equal(again.ok, true);

  await rm(dir, { recursive: true, force: true });
  console.log("Kalendarz: blokada, odmowa i ponowne zapisanie działają.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
