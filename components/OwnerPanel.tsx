"use client";

import { FormEvent, useEffect, useState } from "react";
import { diffDays, formatDot, nightsLabel } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type { Booking } from "@/lib/types";

type SmsInfo = { configured: boolean; provider: string; ownerPhone: string };

function when(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function OwnerPanel() {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sms, setSms] = useState<SmsInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/owner/bookings", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    const data = (await response.json()) as { ok?: boolean; bookings?: Booking[]; sms?: SmsInfo; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error || "Nie udało się wczytać panelu.");
      return;
    }
    setAuthed(true);
    setBookings(data.bookings ?? []);
    setSms(data.sms ?? null);
    setError(null);
  }

  useEffect(() => {
    void load().finally(() => setReady(true));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/owner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Nieprawidłowy kod.");
      return;
    }
    setPin("");
    await load();
  }

  async function logout() {
    await fetch("/api/owner/logout", { method: "POST" });
    setAuthed(false);
    setBookings([]);
  }

  async function reject(id: string) {
    setBusy(id);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/owner/bookings/${id}/reject`, { method: "POST" });
      const data = (await response.json()) as { error?: string; smsOk?: boolean; smsError?: string; freed?: boolean };
      if (!response.ok) {
        setError(data.error || "Nie udało się odrzucić rezerwacji.");
        return;
      }
      setNotice(
        data.smsOk
          ? "Termin wrócił do kalendarza. Gość dostał SMS o odmowie."
          : `Termin wrócił do kalendarza, ale SMS do gościa nie wyszedł${data.smsError ? `: ${data.smsError}` : "."}`,
      );
      setConfirmId(null);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function resend(id: string, target: "owner" | "guest" | "confirm") {
    setBusy(`${target}-${id}`);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/owner/bookings/${id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = (await response.json()) as { error?: string; smsOk?: boolean };
      if (!response.ok || !data.smsOk) {
        setError(data.error || "SMS nie został wysłany.");
        await load();
        return;
      }
      setNotice(
        target === "guest"
          ? "Gość dostał SMS o anulowaniu."
          : target === "confirm"
            ? "Gość dostał SMS z potwierdzeniem."
            : "SMS o rezerwacji wysłany ponownie.",
      );
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function testSms() {
    setBusy("test");
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/owner/sms-test", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Testowy SMS nie wyszedł.");
        return;
      }
      setNotice(`Testowy SMS wysłany na ${sms?.ownerPhone ?? "numer właściciela"}.`);
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return <p className="owner-loading">Wczytuję panel…</p>;
  }

  if (!authed) {
    return (
      <form className="owner-login" onSubmit={login}>
        <p className="kicker">Właściciel</p>
        <h1>Panel rezerwacji</h1>
        <p>Tu odrzucisz termin. Dni wracają do kalendarza, a gość dostaje SMS.</p>
        <label>
          Kod panelu
          <input
            data-testid="owner-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" data-testid="owner-login">
          Wejdź
        </button>
      </form>
    );
  }

  const pending = bookings.filter((booking) => booking.status === "pending");
  const rejected = bookings.filter((booking) => booking.status === "rejected");

  return (
    <div className="owner-panel">
      <div className="owner-top">
        <div>
          <p className="kicker">Właściciel</p>
          <h1>Rezerwacje</h1>
        </div>
        <button type="button" className="button-quiet" onClick={() => void logout()}>
          Wyloguj
        </button>
      </div>

      <section className={sms?.configured ? "sms-banner is-ok" : "sms-banner"}>
        <div>
          <strong>{sms?.configured ? "SMS jest podłączony" : "SMS jeszcze nie jest podłączony"}</strong>
          <p>
            Powiadomienia o nowych terminach idą na {sms?.ownerPhone}. Nadawca: {sms?.provider === "twilio" ? "Twilio" : "SMSAPI"}.
            {sms?.configured
              ? " Możesz wysłać próbę."
              : " Wklej token z smsapi.pl do pliku .env.local jako SMSAPI_TOKEN i zrestartuj stronę."}
          </p>
        </div>
        <button type="button" onClick={() => void testSms()} disabled={busy === "test"}>
          {busy === "test" ? "Wysyłam…" : "Wyślij testowy SMS"}
        </button>
      </section>

      {notice ? <p className="form-ok">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <h2>Oczekujące</h2>
      {pending.length === 0 ? <p className="empty-note">Brak oczekujących rezerwacji. Kalendarz jest wolny.</p> : null}
      <div className="booking-list">
        {pending.map((booking) => (
          <article key={booking.id} className="booking-card" data-testid={`booking-${booking.id}`}>
            <header>
              <h3>{booking.guestName}</h3>
              <a href={`tel:+48${booking.guestPhone}`}>{formatPhone(booking.guestPhone)}</a>
            </header>
            <p>
              {formatDot(booking.checkIn)} – {formatDot(booking.checkOut)}{" "}
              <span>({nightsLabel(diffDays(booking.checkIn, booking.checkOut))})</span>
            </p>
            <p className="muted">Zapisano {when(booking.createdAt)}</p>
            {booking.cancelToken ? (
              <p>
                <a href={`/anuluj/${booking.cancelToken}`}>Link anulowania z SMS-a</a>
              </p>
            ) : null}
            <p className={booking.guestConfirmSms?.status === "sent" ? "sms-ok" : "sms-bad"}>
              {booking.guestConfirmSms?.status === "sent"
                ? "Gość dostał SMS z datami."
                : `SMS do gościa nie wyszedł${booking.guestConfirmSms?.error ? `: ${booking.guestConfirmSms.error}` : "."}`}
            </p>
            <p className={booking.ownerSms.status === "sent" ? "sms-ok" : "sms-bad"}>
              {booking.ownerSms.status === "sent"
                ? "SMS do Ciebie wysłany."
                : `SMS do Ciebie nie wyszedł${booking.ownerSms.error ? `: ${booking.ownerSms.error}` : "."}`}
            </p>
            <div className="card-actions">
              {booking.guestConfirmSms?.status !== "sent" ? (
                <button type="button" onClick={() => void resend(booking.id, "confirm")} disabled={busy === `confirm-${booking.id}`}>
                  Wyślij SMS do gościa
                </button>
              ) : null}
              {booking.ownerSms.status !== "sent" ? (
                <button type="button" onClick={() => void resend(booking.id, "owner")} disabled={busy === `owner-${booking.id}`}>
                  Wyślij SMS do mnie
                </button>
              ) : null}
              <button
                type="button"
                className="button-danger"
                data-testid={`reject-${booking.id}`}
                disabled={busy === booking.id}
                onClick={() => {
                  if (confirmId !== booking.id) {
                    setConfirmId(booking.id);
                    return;
                  }
                  void reject(booking.id);
                }}
              >
                {busy === booking.id ? "Odrzucam…" : confirmId === booking.id ? "Potwierdź odmowę" : "Odmów"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <h2>Odrzucone</h2>
      {rejected.length === 0 ? <p className="empty-note">Jeszcze nikt nie dostał odmowy.</p> : null}
      <div className="booking-list">
        {rejected.map((booking) => (
          <article key={booking.id} className="booking-card is-rejected">
            <header>
              <h3>{booking.guestName}</h3>
              <a href={`tel:+48${booking.guestPhone}`}>{formatPhone(booking.guestPhone)}</a>
            </header>
            <p>
              {formatDot(booking.checkIn)} – {formatDot(booking.checkOut)} — termin wolny
            </p>
            <p className={booking.guestSms?.status === "sent" ? "sms-ok" : "sms-bad"} data-testid={`guest-sms-${booking.id}`}>
              {booking.guestSms?.status === "sent"
                ? "Gość dostał SMS o odmowie."
                : `Gość nie dostał SMS-a${booking.guestSms?.error ? `: ${booking.guestSms.error}` : "."}`}
            </p>
            {booking.guestSms?.status !== "sent" ? (
              <button type="button" onClick={() => void resend(booking.id, "guest")} disabled={busy === `guest-${booking.id}`}>
                {busy === `guest-${booking.id}` ? "Wysyłam…" : "Wyślij SMS o odmowie"}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
