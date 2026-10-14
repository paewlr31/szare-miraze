import type { Metadata } from "next";
import { CancelBooking } from "@/components/CancelBooking";
import { Header } from "@/components/Header";
import { getBookingByToken } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anulowanie rezerwacji — Szare Miraże",
  robots: { index: false, follow: false },
};

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBookingByToken(token);

  return (
    <>
      <Header />
      <main id="tresc" className="owner-main">
        {booking ? (
          <CancelBooking
            token={token}
            guestName={booking.guestName}
            guestPhone={booking.guestPhone}
            checkIn={booking.checkIn}
            checkOut={booking.checkOut}
            status={booking.status}
            smsSent={booking.guestSms?.status === "sent"}
          />
        ) : (
          <section className="cancel-card">
            <p className="kicker">Anulowanie</p>
            <h1>Nie ma takiej rezerwacji</h1>
            <p>Link jest nieaktualny albo został uszkodzony.</p>
          </section>
        )}
      </main>
    </>
  );
}
