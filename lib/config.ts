import { nationalPhone } from "@/lib/phone";

export function ownerSmsPhone(): string {
  return nationalPhone(process.env.OWNER_SMS_PHONE || "889599088") ?? "889599088";
}

export function publicUrl(): string {
  const value = process.env.PUBLIC_URL?.trim() || "http://localhost:3000";
  return value.replace(/\/$/, "");
}

export function panelUrl(): string {
  return `${publicUrl()}/wlasciciel`;
}

export function cancelUrl(token: string): string {
  return `${publicUrl()}/anuluj/${token}`;
}

export function smsConfigured(): boolean {
  const provider = (process.env.SMS_PROVIDER || "smsapi").toLowerCase();
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM?.trim(),
    );
  }
  return Boolean(process.env.SMSAPI_TOKEN?.trim());
}

export function smsProviderName(): string {
  return (process.env.SMS_PROVIDER || "smsapi").toLowerCase() === "twilio" ? "twilio" : "smsapi";
}
