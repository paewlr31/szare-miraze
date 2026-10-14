import { addDays, warsawToday } from "../lib/dates";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const base = process.env.PUBLIC_URL || "http://localhost:3000";

async function waitForServer() {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/availability`, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Serwer nie wstał.");
}

function cookieHeader(response: Response): string {
  return response.headers.getSetCookie().map((item) => item.split(";")[0]).join("; ");
}

async function main() {
  await waitForServer();
  const today = warsawToday();
  const checkIn = addDays(today, 120);
  const checkOut = addDays(checkIn, 4);
  const besideIn = checkOut;
  const besideOut = addDays(besideIn, 2);
  const created: string[] = [];

  const book = async (phone: string, from: string, to: string) => {
    const response = await fetch(`${base}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Test Kalendarza",
        guestPhone: phone,
        checkIn: from,
        checkOut: to,
      }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string; booking?: { id: string } };
    return { status: response.status, data };
  };

  try {
    const first = await book("511100200", checkIn, checkOut);
    if (first.status !== 200 || !first.data.booking) {
      throw new Error(`Pierwsza rezerwacja nie weszła: ${first.status} ${first.data.error ?? ""}`);
    }
    created.push(first.data.booking.id);

    const availability = (await (await fetch(`${base}/api/availability`, { cache: "no-store" })).json()) as {
      blocked: Array<{ checkIn: string; checkOut: string }>;
    };
    if (!availability.blocked.some((stay) => stay.checkIn === checkIn && stay.checkOut === checkOut)) {
      throw new Error("Zapisany termin nie blokuje kalendarza.");
    }

    const clash = await book("511100201", addDays(checkIn, 1), addDays(checkOut, 1));
    if (clash.status !== 409) throw new Error(`Nakładający się termin dostał status ${clash.status}.`);

    const beside = await book("511100202", besideIn, besideOut);
    if (beside.status !== 200 || !beside.data.booking) {
      throw new Error(`Sąsiedni termin nie wszedł: ${beside.status} ${beside.data.error ?? ""}`);
    }
    created.push(beside.data.booking.id);

    const login = await fetch(`${base}/api/owner/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: process.env.OWNER_PIN }),
    });
    if (!login.ok) throw new Error("Logowanie do panelu nie działa.");
    const cookie = cookieHeader(login);
    const listed = (await (
      await fetch(`${base}/api/owner/bookings`, { headers: { Cookie: cookie }, cache: "no-store" })
    ).json()) as { bookings?: Array<{ id: string; cancelToken?: string }> };
    const bookingId = first.data.booking?.id;
    const token = listed.bookings?.find((item) => item.id === bookingId)?.cancelToken;
    if (!token) throw new Error("SMS właściciela nie ma linku anulowania.");

    const page = await fetch(`${base}/anuluj/${token}`);
    if (!page.ok) throw new Error("Strona linku anulowania nie działa.");
    const reject = await fetch(`${base}/api/anuluj/${token}`, { method: "POST" });
    const rejected = (await reject.json()) as { freed?: boolean; smsOk?: boolean; error?: string };
    if (!reject.ok || !rejected.freed) throw new Error(rejected.error || "Link anulowania nie zwolnił terminu.");

    const after = (await (await fetch(`${base}/api/availability`, { cache: "no-store" })).json()) as {
      blocked: Array<{ checkIn: string }>;
    };
    if (after.blocked.some((stay) => stay.checkIn === checkIn)) {
      throw new Error("Po odmowie termin dalej jest zajęty.");
    }

    const retry = await book("511100203", checkIn, checkOut);
    if (retry.status !== 200 || !retry.data.booking) {
      throw new Error(`Po odmowie nie da się znowu zarezerwować: ${retry.status} ${retry.data.error ?? ""}`);
    }
    created.push(retry.data.booking.id);

    console.log("HTTP: blokada, link anulowania i ponowna rezerwacja działają.");
    console.log(`SMS przy odmowie: ${rejected.smsOk ? "wysłany" : "niewysłany, brak nadawcy"}`);
  } finally {
    const login = await fetch(`${base}/api/owner/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: process.env.OWNER_PIN }),
    });
    if (login.ok) {
      const cookie = cookieHeader(login);
      const list = (await (
        await fetch(`${base}/api/owner/bookings`, { headers: { Cookie: cookie }, cache: "no-store" })
      ).json()) as { bookings?: Array<{ id: string; status: string; guestName: string }> };
      for (const booking of list.bookings ?? []) {
        if (booking.status === "pending" && booking.guestName === "Test Kalendarza") {
          await fetch(`${base}/api/owner/bookings/${booking.id}/reject`, {
            method: "POST",
            headers: { Cookie: cookie },
          });
        }
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
