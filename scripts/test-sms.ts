import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const { ownerSmsPhone } = await import("../lib/config");
  const { testAlert } = await import("../lib/messages");
  const { sendSms } = await import("../lib/sms");

  const phone = ownerSmsPhone();
  console.log(`Wysyłam testowy SMS na ${phone} przez ${process.env.SMS_PROVIDER || "smsapi"}…`);
  const result = await sendSms(phone, testAlert());
  if (!result.ok) {
    console.error(result.error);
    console.error("");
    console.error("Żeby SMS naprawdę wyszedł, potrzebne jest konto nadawcy:");
    console.error("1. https://www.smsapi.pl — polski odpowiednik Resend, tylko do SMS.");
    console.error("2. Token OAuth (uprawnienie: wysyłka SMS) wklej jako SMSAPI_TOKEN w .env.local.");
    console.error("3. Jeśli nie masz zatwierdzonej nazwy nadawcy, ustaw SMSAPI_FROM=2way.");
    console.error("4. Doładuj konto. Potem uruchom ponownie: npm run sms");
    process.exit(1);
  }
  console.log(`Wysłano. Identyfikator: ${result.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
