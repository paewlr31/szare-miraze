"use client";

import { useEffect, useState } from "react";
import { diffDays, formatDot, nightsLabel } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";

export function CancelBooking({
  token,
  guestName,
  guestPhone,
  checkIn,
  checkOut,
  status,
  smsSent,
}: {
  token: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: "pending" | "rejected";
  smsSent: boolean;
}) {
  const [phase, setPhase] = useState<"pending" | "done" | "failed">(status === "rejected" ? "done" : "pending");
  const [sent, setSent] = useState(smsSent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/anuluj/${token}`, { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; smsOk?: boolean; error?: string; smsError?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || "Nie udało się anulować terminu.");
        return;
      }
      setPhase("done");
      setSent(Boolean(data.smsOk));
      if (!data.smsOk) setError(data.smsError || "Termin zwolniony, ale SMS do gościa nie wyszedł.");
    } catch {
      setError("Nie udało się anulować terminu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cancel-card">
      <p className="kicker">Anulowanie</p>
      <h1>{phase === "done" ? "Termin zwolniony" : "Anulować rezerwację?"}</h1>
      <p className="stay-summary">
        {formatDot(checkIn)} – {formatDot(checkOut)}
        <span>{nightsLabel(diffDays(checkIn, checkOut))}</span>
      </p>
      <p>
        {guestName}
        <br />
        <a href={`tel:+48${guestPhone}`}>{formatPhone(guestPhone)}</a>
      </p>
      {phase === "pending" ? (
        <p>Dni wrócą do kalendarza, a gość dostanie SMS, że rezerwacja została anulowana.</p>
      ) : (
        <p>{sent ? "Gość dostał SMS o anulowaniu." : "Kalendarz jest wolny. SMS do gościa jeszcze nie wyszedł."}</p>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      {phase === "pending" || !sent ? (
        <button type="button" data-testid="cancel-booking" onClick={() => void cancel()} disabled={!ready || busy}>
          {busy ? "Anuluję…" : phase === "pending" ? "Anuluj ten termin" : "Wyślij SMS o anulowaniu"}
        </button>
      ) : null}
    </section>
  );
}
