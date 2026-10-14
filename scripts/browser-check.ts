import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { addDays, warsawToday } from "../lib/dates";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

async function overflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
}

async function main() {
  await mkdir("tmp", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: /Szare/ }).waitFor();

  const shots = page.locator(".shot img");
  const count = await shots.count();
  if (count !== 16) throw new Error(`Oczekiwano 16 zdjęć, jest ${count}.`);
  for (let index = 0; index < count; index += 1) {
    const loaded = await shots.nth(index).evaluate((img) => {
      const image = img as HTMLImageElement;
      return image.complete && image.naturalWidth > 40;
    });
    if (!loaded) throw new Error(`Zdjęcie numer ${index + 1} nie weszło.`);
  }
  if (await overflow(page)) throw new Error("Na desktopie strona wychodzi poza szerokość.");
  await page.screenshot({ path: "tmp/home-desktop.png", fullPage: true });

  const checkIn = addDays(warsawToday(), 40);
  const checkOut = addDays(checkIn, 3);
  await page.locator(`[data-testid="day-${checkIn}"]`).click();
  await page.locator(`[data-testid="day-${checkOut}"]`).click();
  await page.getByLabel("Imię i nazwisko").fill("Anna Kowalska");
  await page.getByLabel("Telefon").fill("500 600 701");
  await page.locator("#rezerwacja").screenshot({ path: "tmp/calendar.png" });
  await page.getByTestId("booking-submit").click();
  await page.getByText("jest zablokowany").waitFor();
  await page.waitForFunction((iso) => {
    return document.querySelector(`[data-testid="day-${iso}"]`)?.getAttribute("data-state") === "blocked";
  }, checkIn);
  await page.locator(`[data-testid="day-${checkIn}"]`).click();
  await page.getByText("Ten dzień jest już zajęty.").waitFor();
  await page.screenshot({ path: "tmp/booked.png", fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors: string[] = [];
  mobile.on("pageerror", (error) => mobileErrors.push(error.message));
  await mobile.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobile.getByRole("heading", { level: 1 }).waitFor();
  if (await overflow(mobile)) throw new Error("Na telefonie strona wychodzi poza szerokość.");
  await mobile.screenshot({ path: "tmp/home-mobile.png", fullPage: true });
  await mobile.getByRole("button", { name: "Menu" }).click();
  await mobile.getByRole("link", { name: "Rezerwacja" }).click();
  await mobile.locator("#rezerwacja").waitFor();
  await mobile.screenshot({ path: "tmp/mobile-calendar.png" });
  await mobile.close();

  await page.goto("http://localhost:3000/wlasciciel", { waitUntil: "networkidle" });
  await page.getByTestId("owner-pin").fill(process.env.OWNER_PIN ?? "");
  await page.getByTestId("owner-login").click();
  await page.getByRole("heading", { name: "Rezerwacje" }).waitFor();
  await page.getByText("Anna Kowalska").waitFor();
  await page.screenshot({ path: "tmp/owner.png", fullPage: true });
  const reject = page.locator("[data-testid^='reject-']").first();
  await reject.click();
  await page.getByRole("button", { name: "Potwierdź odmowę" }).click();
  await page.getByText("Termin wrócił do kalendarza").waitFor();

  await page.goto("http://localhost:3000/#rezerwacja", { waitUntil: "networkidle" });
  await page.waitForFunction((iso) => {
    const day = document.querySelector(`[data-testid="day-${iso}"]`);
    return Boolean(day) && day?.getAttribute("data-state") !== "blocked";
  }, checkIn);

  if (errors.length || mobileErrors.length) {
    throw new Error([...errors, ...mobileErrors].join("\n"));
  }
  console.log("Przeglądarka: zdjęcia, kalendarz, blokada i odmowa działają.");
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
