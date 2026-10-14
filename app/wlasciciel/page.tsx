import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { OwnerPanel } from "@/components/OwnerPanel";

export const metadata: Metadata = {
  title: "Panel właściciela — Szare Miraże",
  robots: { index: false, follow: false },
};

export default function OwnerPage() {
  return (
    <>
      <Header />
      <main id="tresc" className="owner-main">
        <OwnerPanel />
      </main>
    </>
  );
}
