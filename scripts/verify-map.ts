import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { addDays, warsawToday } from "../lib/dates";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

async function main() {
  await mkdir("tmp", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://localhost:3000/#kontakt", { waitUntil: "domcontentloaded" });
  const map = page.locator("iframe.map");
  await map.waitFor();
  const src = await map.getAttribute("src");
  if (!src?.includes("maps.google.com")) throw new Error(`Zła mapa: ${src}`);
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500);
  await page.locator("#kontakt").screenshot({ path: "tmp/map-desktop.png" });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto("http://localhost:3000/#kontakt", { waitUntil: "domcontentloaded" });
  const mobileMap = mobile.locator("iframe.map");
  await mobileMap.waitFor();
  await mobileMap.scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(3500);
  await mobile.locator("#kontakt").screenshot({ path: "tmp/map-mobile.png" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  if (overflow) throw new Error("Mapa rozpycha stronę na telefonie.");
  await mobile.close();
  if (process.env.ONLY_MAP === "1") {
    console.log("Mapa jest na stronie.");
    await browser.close();
    return;
  }

  const checkIn = addDays(warsawToday(), 20);
  const checkOut = addDays(checkIn, 2);
  await page.goto("http://localhost:3000/#rezerwacja", { waitUntil: "domcontentloaded" });
  await page.locator(`[data-testid="day-${checkIn}"]`).click();
  await page.locator(`[data-testid="day-${checkOut}"]`).click();
  await page.getByLabel("Imię i nazwisko").fill("Ewa Testowa");
  await page.getByLabel("Telefon").fill("889599088");
  await page.getByTestId("booking-submit").click();
  await page.getByText("jest zablokowany").waitFor();

  await page.goto("http://localhost:3000/wlasciciel", { waitUntil: "domcontentloaded" });
  await page.getByTestId("owner-pin").fill(process.env.OWNER_PIN ?? "");
  await page.getByTestId("owner-login").click();
  await page.getByRole("link", { name: "Link anulowania z SMS-a" }).click();
  await page.getByRole("heading", { name: "Anulować rezerwację?" }).waitFor();
  await page.screenshot({ path: "tmp/cancel-page.png" });
  await page.getByTestId("cancel-booking").click();
  await page.getByRole("heading", { name: "Termin zwolniony" }).waitFor();

  await page.goto("http://localhost:3000/#rezerwacja", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((iso) => {
    const day = document.querySelector(`[data-testid="day-${iso}"]`);
    return Boolean(day) && day?.getAttribute("data-state") !== "blocked";
  }, checkIn);

  console.log("Mapa i anulowanie z linku działają.");
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
