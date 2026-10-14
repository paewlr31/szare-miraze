"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  MAX_HORIZON_DAYS,
  MAX_NIGHTS,
  addDays,
  daysInMonth,
  diffDays,
  formatDot,
  formatLong,
  isoFromParts,
  mondayPad,
  monthTitle,
  nightsLabel,
  overlaps,
  warsawToday,
} from "@/lib/dates";
import { nationalPhone } from "@/lib/phone";
import { site } from "@/lib/site";
import type { BlockedStay } from "@/lib/types";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

type Done = {
  checkIn: string;
  checkOut: string;
  nights: number;
  guestSmsOk: boolean;
  ownerSmsOk: boolean;
};

function nightIsBlocked(day: string, blocked: BlockedStay[]): boolean {
  return blocked.some((stay) => day >= stay.checkIn && day < stay.checkOut);
}

export function BookingCalendar() {
  const today = warsawToday();
  const maxDay = addDays(today, MAX_HORIZON_DAYS);
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    monthIndex: Number(today.slice(5, 7)) - 1,
  }));
  const [blocked, setBlocked] = useState<BlockedStay[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const response = await fetch("/api/availability", { cache: "no-store" });
        const data = (await response.json()) as { blocked?: BlockedStay[] };
        if (!ignore) {
          setBlocked(data.blocked ?? []);
          setLoadError(response.ok ? null : "Nie udało się wczytać zajętych terminów.");
        }
      } catch {
        if (!ignore) setLoadError("Nie udało się wczytać zajętych terminów.");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const previewEnd = checkIn && !checkOut && hover && hover > checkIn ? hover : null;
  const previewInvalid = Boolean(
    checkIn &&
      previewEnd &&
      (diffDays(checkIn, previewEnd) > MAX_NIGHTS ||
        blocked.some((stay) => overlaps(checkIn, previewEnd, stay.checkIn, stay.checkOut))),
  );
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const selectionClash = Boolean(
    checkIn &&
      checkOut &&
      blocked.some((stay) => overlaps(checkIn, checkOut, stay.checkIn, stay.checkOut)),
  );

  function shift(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  }

  function pick(day: string) {
    if (day < today || day > maxDay) return;
    const blockedNight = nightIsBlocked(day, blocked);
    if (!checkIn || checkOut) {
      if (blockedNight) {
        setError("Ten dzień jest już zajęty.");
        return;
      }
      setCheckIn(day);
      setCheckOut(null);
      setError(null);
      setDone(null);
      return;
    }
    if (day <= checkIn) {
      if (blockedNight) {
        setError("Ten dzień jest już zajęty.");
        return;
      }
      setCheckIn(day);
      setCheckOut(null);
      setError(null);
      return;
    }
    if (diffDays(checkIn, day) > MAX_NIGHTS) {
      setError(`Maksymalnie ${nightsLabel(MAX_NIGHTS)}.`);
      return;
    }
    if (blocked.some((stay) => overlaps(checkIn, day, stay.checkIn, stay.checkOut))) {
      setError("W tym zakresie jest już rezerwacja. Wybierz inny wyjazd.");
      return;
    }
    setCheckOut(day);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!checkIn || !checkOut) {
      setError("Wybierz przyjazd i wyjazd w kalendarzu.");
      return;
    }
    if (selectionClash) {
      setError("Ten termin właśnie został zajęty. Wybierz inny.");
      setRefresh((value) => value + 1);
      return;
    }
    if (guestName.trim().length < 2) {
      setError("Podaj imię i nazwisko.");
      return;
    }
    if (!nationalPhone(guestPhone)) {
      setError("Podaj numer telefonu, dziewięć cyfr.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestPhone,
          checkIn,
          checkOut,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        guestSmsOk?: boolean;
        ownerSmsOk?: boolean;
        booking?: { nights: number };
      };
      if (!response.ok || !data.ok || !data.booking) {
        setError(data.error || "Nie udało się zapisać terminu.");
        setRefresh((value) => value + 1);
        return;
      }
      setDone({
        checkIn,
        checkOut,
        nights: data.booking.nights,
        guestSmsOk: Boolean(data.guestSmsOk),
        ownerSmsOk: Boolean(data.ownerSmsOk),
      });
      setCheckIn(null);
      setCheckOut(null);
      setGuestName("");
      setGuestPhone("");
      setRefresh((value) => value + 1);
    } catch {
      setError("Nie udało się zapisać rezerwacji. Spróbuj jeszcze raz.");
    } finally {
      setPending(false);
    }
  }

  const todayMonth = Number(today.slice(5, 7)) - 1;
  const todayYear = Number(today.slice(0, 4));
  const atStart = cursor.year < todayYear || (cursor.year === todayYear && cursor.monthIndex <= todayMonth);
  const horizon = new Date(Number(maxDay.slice(0, 4)), Number(maxDay.slice(5, 7)) - 1, 1);
  const secondMonth = new Date(cursor.year, cursor.monthIndex + 1, 1);
  const atEnd = secondMonth >= horizon;
  const months = [cursor, { year: secondMonth.getFullYear(), monthIndex: secondMonth.getMonth() }];

  return (
    <div className="reserve-grid">
      <div className="calendar-card" onMouseLeave={() => setHover(null)}>
        <div className="calendar-nav">
          <button type="button" onClick={() => shift(-1)} disabled={atStart} aria-label="Poprzedni miesiąc">
            ←
          </button>
          <p>Kliknij przyjazd, potem wyjazd. Dzień wyjazdu zostaje wolny.</p>
          <button type="button" onClick={() => shift(1)} disabled={atEnd} aria-label="Następny miesiąc">
            →
          </button>
        </div>
        {loadError ? <p className="form-error">{loadError}</p> : null}
        <div className="months">
          {months.map((month) => (
            <MonthGrid
              key={`${month.year}-${month.monthIndex}`}
              year={month.year}
              monthIndex={month.monthIndex}
              today={today}
              maxDay={maxDay}
              blocked={blocked}
              checkIn={checkIn}
              checkOut={checkOut}
              previewEnd={previewEnd}
              previewInvalid={previewInvalid}
              onPick={pick}
              onHover={setHover}
            />
          ))}
        </div>
        <ul className="legend">
          <li><i className="swatch is-free" /> wolne</li>
          <li><i className="swatch is-blocked" /> zajęte</li>
          <li><i className="swatch is-selected" /> wybrany pobyt</li>
        </ul>
      </div>

      <form className="stay-form" data-testid="booking-form" onSubmit={submit}>
        <h3>Twój termin</h3>
        {checkIn && checkOut ? (
          <p className="stay-summary" data-testid="stay-summary">
            {formatDot(checkIn)} – {formatDot(checkOut)}
            <span>{nightsLabel(nights)}</span>
          </p>
        ) : (
          <p className="stay-summary is-empty">Najpierw zaznacz daty w kalendarzu.</p>
        )}
        <label>
          Imię i nazwisko
          <input
            name="guestName"
            autoComplete="name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label>
          Telefon
          <input
            name="guestPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="np. 500 600 700"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            required
          />
        </label>
        <p className="form-note">Na ten numer wyślemy SMS z datami. Właściciel dostanie drugą wiadomość, z linkiem do anulowania.</p>
        {selectionClash ? <p className="form-error">Ten zakres nachodzi na zajęty termin.</p> : null}
        {error ? (
          <p className="form-error" role="alert" data-testid="booking-status">
            {error}
          </p>
        ) : null}
        {done ? (
          <div className={done.guestSmsOk && done.ownerSmsOk ? "form-ok" : "form-warn"} role="status" data-testid="booking-status">
            <p>
              Termin {formatDot(done.checkIn)} – {formatDot(done.checkOut)} ({nightsLabel(done.nights)}) jest zablokowany.
            </p>
            {done.guestSmsOk && done.ownerSmsOk ? (
              <p>SMS z datami poszedł na Twój numer i do właściciela.</p>
            ) : (
              <p>
                Termin zapisany, ale SMS teraz nie wyszedł. Zadzwoń:{" "}
                <a href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</a>.
              </p>
            )}
          </div>
        ) : null}
        <button type="submit" data-testid="booking-submit" disabled={pending || !checkIn || !checkOut || selectionClash}>
          {pending ? "Zapisuję…" : checkIn && checkOut ? `Zablokuj termin · ${nightsLabel(nights)}` : "Zablokuj termin"}
        </button>
      </form>
    </div>
  );
}

function MonthGrid({
  year,
  monthIndex,
  today,
  maxDay,
  blocked,
  checkIn,
  checkOut,
  previewEnd,
  previewInvalid,
  onPick,
  onHover,
}: {
  year: number;
  monthIndex: number;
  today: string;
  maxDay: string;
  blocked: BlockedStay[];
  checkIn: string | null;
  checkOut: string | null;
  previewEnd: string | null;
  previewInvalid: boolean;
  onPick: (day: string) => void;
  onHover: (day: string) => void;
}) {
  const cells: Array<string | null> = [
    ...Array.from({ length: mondayPad(year, monthIndex) }, () => null),
    ...Array.from({ length: daysInMonth(year, monthIndex) }, (_, index) => isoFromParts(year, monthIndex, index + 1)),
  ];

  return (
    <div className="month">
      <h3>{monthTitle(year, monthIndex)}</h3>
      <div className="weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="days" role="grid" aria-label={monthTitle(year, monthIndex)}>
        {cells.map((iso, index) => {
          if (!iso) return <span key={`empty-${year}-${monthIndex}-${index}`} className="day-empty" />;
          const past = iso < today || iso > maxDay;
          const blockedNight = nightIsBlocked(iso, blocked);
          const selected = iso === checkIn || iso === checkOut;
          const inStay = Boolean(checkIn && checkOut && iso > checkIn && iso < checkOut);
          const inPreview = Boolean(previewEnd && checkIn && iso > checkIn && iso <= previewEnd);
          let state = "free";
          if (past) state = "past";
          else if (selected) state = "selected";
          else if (inStay) state = "range";
          else if (inPreview && previewInvalid) state = "invalid";
          else if (inPreview) state = "preview";
          else if (blockedNight) state = "blocked";

          const label = [
            formatLong(iso),
            blockedNight ? "zajęty" : "wolny",
            iso === checkIn ? "przyjazd" : "",
            iso === checkOut ? "wyjazd" : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={iso}
              type="button"
              className={`day is-${state}`}
              data-testid={`day-${iso}`}
              data-state={state}
              disabled={past}
              aria-label={label}
              onMouseEnter={() => onHover(iso)}
              onFocus={() => onHover(iso)}
              onClick={() => onPick(iso)}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
