"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { site } from "@/lib/site";

const links = [
  ["/#apartament", "Apartament"],
  ["/#galeria", "Galeria"],
  ["/#okolica", "Okolica"],
  ["/#rezerwacja", "Rezerwacja"],
  ["/#kontakt", "Kontakt"],
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <a className="logo-link" href="/" aria-label="Szare Miraże, strona główna">
        <Logo />
      </a>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="menu-glowne"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">Menu</span>
        <i />
        <i />
      </button>
      <nav id="menu-glowne" className={open ? "is-open" : undefined}>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <a className="header-phone" href={`tel:${site.phoneE164}`}>
          {site.phoneDisplay}
        </a>
        <a className="header-cta" href="/#rezerwacja" onClick={() => setOpen(false)}>
          Zarezerwuj
        </a>
      </div>
    </header>
  );
}
