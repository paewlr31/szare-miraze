import { cancelUrl } from "@/lib/config";
import { diffDays, formatDot, nightsLabel } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { site } from "@/lib/site";
import type { Booking } from "@/lib/types";

type Stay = Pick<Booking, "guestName" | "guestPhone" | "checkIn" | "checkOut" | "cancelToken">;

function stayLine(booking: Pick<Booking, "checkIn" | "checkOut">): string {
  const nights = diffDays(booking.checkIn, booking.checkOut);
  return `${formatDot(booking.checkIn)} - ${formatDot(booking.checkOut)} (${nightsLabel(nights)}).`;
}

export function ownerAlert(booking: Stay): string {
  return [
    "Szare Miraże: nowa rezerwacja.",
    `${booking.guestName}, tel. ${formatPhone(booking.guestPhone)}.`,
    stayLine(booking),
    `Anuluj termin: ${cancelUrl(booking.cancelToken)}`,
  ].join("\n");
}

export function guestConfirmation(booking: Pick<Booking, "checkIn" | "checkOut">): string {
  return [
    "Szare Miraże: rezerwacja zapisana.",
    stayLine(booking),
    `${site.street}, ${site.city}.`,
    `Tel. ${site.phoneDisplay}.`,
  ].join("\n");
}

export function guestRejection(booking: Pick<Booking, "checkIn" | "checkOut">): string {
  return `Szare Miraże: rezerwacja ${formatDot(booking.checkIn)} - ${formatDot(booking.checkOut)} została anulowana. Termin jest znowu wolny. Tel. ${site.phoneDisplay}.`;
}

export function testAlert(): string {
  return "Szare Miraże: testowy SMS. Powiadomienia z kalendarza rezerwacji działają.";
}
