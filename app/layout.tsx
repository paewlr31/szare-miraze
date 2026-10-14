import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL || "http://localhost:3000"),
  title: "Szare Miraże — apartament w Busku-Zdroju",
  description:
    "Apartament na parterze w Busku-Zdroju. Sypialnia, aneks kuchenny, salon i widok na ogród. Sprawdź wolny termin.",
  openGraph: {
    title: "Szare Miraże — apartament w Busku-Zdroju",
    description: "Parterowy apartament z sypialnią, aneksem kuchennym i widokiem na ogród.",
    locale: "pl_PL",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#tresc">
          Przejdź do treści
        </a>
        {children}
      </body>
    </html>
  );
}
