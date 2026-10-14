import { BookingCalendar } from "@/components/BookingCalendar";
import { Gallery } from "@/components/Gallery";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { gardenPhotos, heroPhoto, interiorPhotos, photoSrc } from "@/lib/photos";
import { mapEmbedUrl, postalCity, site } from "@/lib/site";

const facts = [
  ["Parter", "Mieszkanie na parterze"],
  ["Sypialnia", "Jedno łóżko dwuosobowe, pościel na miejscu"],
  ["Aneks kuchenny", "Lodówka i miejsce do przygotowania posiłków"],
  ["Salon", "Telewizor z płaskim ekranem"],
  ["Łazienka", "Ręczniki dla gości"],
  ["Wi‑Fi", "Bezpłatne w całym apartamencie"],
];

const nearby = [
  ["Galeria Sztuki Zielona", "500 m"],
  ["Zespół Klasztorny Ponorbertański", "w pobliżu"],
  ["Synagoga", "w pobliżu"],
  ["Dom towarowy", "w pobliżu"],
  ["Zespół Budynków Zakładu Zdrojowego z parkiem", "w pobliżu"],
  ["Stadion Miejski w Kielcach", "48 km"],
  ["Hala Legionów w Kielcach", "48 km"],
  ["Lotnisko Radom-Sadków", "129 km"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Apartment",
  name: site.name,
  description: "Apartament na parterze w Busku-Zdroju z sypialnią, aneksem kuchennym, salonem i widokiem na ogród.",
  address: {
    "@type": "PostalAddress",
    streetAddress: site.street,
    postalCode: site.postalCode,
    addressLocality: site.city,
    addressCountry: "PL",
  },
  telephone: site.phoneE164,
  email: site.email,
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Bezpłatne WiFi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Aneks kuchenny", value: true },
    { "@type": "LocationFeatureSpecification", name: "Pościel i ręczniki", value: true },
  ],
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="tresc">
        <section className="hero">
          <div className="hero-photo">
            <img src={photoSrc(heroPhoto.file)} alt={heroPhoto.alt} fetchPriority="high" />
            <p>
              {site.street}
              <span>{postalCity}</span>
            </p>
          </div>
          <div className="hero-copy">
            <p className="kicker">Apartament do wynajęcia</p>
            <h1>
              Szare <em>Miraże</em>
            </h1>
            <p className="lede">
              Parterowy apartament w Busku-Zdroju, z widokiem na ogród. Sypialnia, aneks kuchenny i salon — spokojne miejsce dla dwojga.
            </p>
            <div className="hero-actions">
              <a className="button" href="#rezerwacja">
                Sprawdź wolne terminy
              </a>
              <a className="button-quiet" href="#apartament">
                Zobacz apartament
              </a>
            </div>
          </div>
        </section>

        <section id="apartament" className="section">
          <div className="section-head">
            <p className="kicker">01 — Apartament</p>
            <h2>Cicho, jasno, na parterze</h2>
          </div>
          <div className="about-grid">
            <div className="prose">
              <p>
                Szare Miraże leżą w Busku-Zdroju, przy osiedlu Kazimierza Pułaskiego. Z okien widać ogród, a w całym mieszkaniu działa bezpłatne Wi‑Fi.
              </p>
              <p>
                Na miejscu jest jedna sypialnia, aneks kuchenny z lodówką i salon z telewizorem. Ręczniki i pościel czekają przygotowane.
              </p>
            </div>
            <aside className="score">
              <strong>9,4</strong>
              <span>tak tę lokalizację oceniają pary, za pobyt dla dwóch osób</span>
            </aside>
          </div>
          <ul className="facts">
            {facts.map(([title, detail]) => (
              <li key={title}>
                <span>{title}</span>
                <small>{detail}</small>
              </li>
            ))}
          </ul>
        </section>

        <section id="galeria" className="section section-gallery">
          <div className="section-head">
            <p className="kicker">02 — Galeria</p>
            <h2>Wnętrze</h2>
          </div>
          <Gallery photos={interiorPhotos} />
        </section>

        <section id="okolica" className="section">
          <div className="section-head">
            <p className="kicker">03 — Okolica</p>
            <h2>Busko-Zdrój za progiem</h2>
          </div>
          <p className="lede narrow">
            Obok są zdrojowy park, klasztor i synagoga. Do Galerii Sztuki Zielona jest około pięciuset metrów.
          </p>
          <Gallery photos={gardenPhotos} layout="strip" />
          <ul className="distances">
            {nearby.map(([place, distance]) => (
              <li key={place}>
                <span>{place}</span>
                <strong>{distance}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section id="rezerwacja" className="reserve">
          <div className="wrap">
            <div className="section-head is-light">
              <p className="kicker">04 — Rezerwacja</p>
              <h2>Wybierz termin</h2>
              <p className="lede">
                Po zapisie SMS z datami idzie do Ciebie i do właściciela. Zajęty termin nie da się zapisać drugi raz. Właściciel anuluje go linkiem z wiadomości — wtedy dni wracają, a Ty dostajesz SMS.
              </p>
            </div>
            <BookingCalendar />
          </div>
        </section>

        <section id="kontakt" className="section contact">
          <div className="section-head">
            <p className="kicker">05 — Kontakt</p>
            <h2>Szare Miraże</h2>
          </div>
          <div className="contact-grid">
            <address>
              {site.street}
              <br />
              {postalCity}
            </address>
            <div>
              <a className="contact-phone" href={`tel:${site.phoneE164}`}>
                {site.phoneDisplay}
              </a>
              <a className="contact-mail" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              <a className="button" href={site.mapsUrl} target="_blank" rel="noreferrer">
                Otwórz w Google Maps
              </a>
            </div>
          </div>
          <iframe
            className="map"
            title="Mapa dojazdu do Szarych Miraży, Busko-Zdrój"
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      </main>
      <footer className="footer">
        <Logo />
        <p>
          {site.street}, {postalCity}
        </p>
        <a href="/wlasciciel">Panel właściciela</a>
      </footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
