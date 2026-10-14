export const site = {
  name: "Szare Miraże",
  street: "os. Kazimierza Pułaskiego 10/21",
  postalCode: "28-100",
  city: "Busko-Zdrój",
  email: "babany@onet.eu",
  phoneDisplay: "668 311 444",
  phoneE164: "+48668311444",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=os.+Kazimierza+Pu%C5%82askiego+10%2F21+28-100+Busko-Zdr%C3%B3j",
} as const;

export const postalCity = `${site.postalCode} ${site.city}`;

export const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${site.street}, ${postalCity}`)}&hl=pl&z=16&output=embed`;
