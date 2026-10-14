import { smsPhone } from "@/lib/phone";

export type SmsResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retryable?: boolean };

const SMSAPI_ERRORS: Record<number, string> = {
  8: "Błąd żądania do SMSAPI.",
  11: "Wiadomość jest za długa.",
  13: "SMSAPI odrzuciło numer telefonu.",
  14: "Nieprawidłowe pole nadawcy. Ustaw SMSAPI_FROM=2way albo dodaj nazwę w panelu SMSAPI (Pola nadawcy).",
  98: "Konto SMSAPI jest ograniczone i może wysyłać tylko na numer użyty przy rejestracji.",
  101: "Token SMSAPI odrzucony. Sprawdź SMSAPI_TOKEN.",
  102: "Nieprawidłowy login albo hasło SMSAPI.",
  103: "Brak środków na koncie SMSAPI.",
  105: "Adres IP serwera nie jest dopuszczony w filtrze SMSAPI.",
  110: "Usługa SMS nie jest włączona na tym koncie SMSAPI.",
  200: "SMSAPI nie przyjęło wiadomości. Spróbuj ponownie.",
  202: "SMSAPI jest chwilowo przeciążone. Spróbuj ponownie.",
  401: "Token SMSAPI nie ma uprawnienia do wysyłki.",
};

function explainSmsApi(code: number, fallback: string): string {
  return SMSAPI_ERRORS[code] ?? fallback;
}

function isRetryable(code: number | undefined): boolean {
  return code === 200 || code === 202 || code === 8;
}

async function postSmsApi(to: string, message: string, token: string): Promise<SmsResult> {
  const params = new URLSearchParams({
    to,
    message,
    format: "json",
    encoding: "utf-8",
  });
  const from = process.env.SMSAPI_FROM?.trim();
  if (from) params.set("from", from);

  let response: Response;
  try {
    response = await fetch("https://api.smsapi.pl/sms.do", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return {
      ok: false,
      retryable: true,
      error: "Nie udało się połączyć z SMSAPI. Sprawdź internet i spróbuj ponownie.",
    };
  }

  const raw = await response.text();
  type SmsApiBody = {
    error?: number;
    message?: string;
    count?: number;
    list?: Array<{ id?: string; status?: string }>;
  };
  let data: SmsApiBody | null = null;
  try {
    data = JSON.parse(raw) as SmsApiBody;
  } catch {
    data = null;
  }

  if (!data && /^ERROR:\d+/.test(raw)) {
    const code = Number(raw.split(":")[1]);
    return { ok: false, retryable: isRetryable(code), error: explainSmsApi(code, raw) };
  }

  if (!data || data.error || !response.ok || !data.list?.[0]?.id) {
    const code = data?.error;
    const fallback = data?.message || `SMSAPI zwróciło błąd${response.ok ? "" : ` HTTP ${response.status}`}.`;
    return {
      ok: false,
      retryable: isRetryable(code),
      error: code ? explainSmsApi(code, fallback) : fallback,
    };
  }

  return { ok: true, id: data.list[0].id };
}

async function postTwilio(to: string, message: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();
  if (!sid || !token || !from) {
    return {
      ok: false,
      error: "Brak TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN albo TWILIO_FROM.",
    };
  }

  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `+${to}`, From: from, Body: message }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, retryable: true, error: "Nie udało się połączyć z Twilio." };
  }

  const data = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null;
  if (!response.ok || !data?.sid) {
    return {
      ok: false,
      retryable: response.status >= 500,
      error: data?.message || `Twilio zwróciło HTTP ${response.status}.`,
    };
  }
  return { ok: true, id: data.sid };
}

async function sendOnce(to: string, message: string): Promise<SmsResult> {
  const provider = (process.env.SMS_PROVIDER || "smsapi").toLowerCase();
  if (provider === "twilio") return postTwilio(to, message);

  const token = process.env.SMSAPI_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      error:
        "Brak SMSAPI_TOKEN. Załóż konto na smsapi.pl, wygeneruj token OAuth i wklej go do .env.local.",
    };
  }
  return postSmsApi(to, message, token);
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const to = smsPhone(phone);
  if (!to) return { ok: false, error: "Nieprawidłowy numer telefonu." };
  const text = message.trim();
  if (!text) return { ok: false, error: "Pusta treść SMS-a." };

  let last: SmsResult = { ok: false, error: "Nie wysłano SMS-a." };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    last = await sendOnce(to, text);
    if (last.ok || !last.retryable || attempt === 3) return last;
    await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
  }
  return last;
}
