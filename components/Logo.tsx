export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={light ? "logo is-light" : "logo"}>
      <span className="logo-type">
        <strong>Szare Miraże</strong>
        <small>Busko-Zdrój</small>
      </span>
      <svg viewBox="0 0 64 36" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2 27c8-9 16-9 24 0s16 9 36 0" />
        <path d="M2 19c8-8 16-8 24 0s16 8 36 0" opacity="0.62" />
        <path d="M2 12c8-6 16-6 24 0s16 6 36 0" opacity="0.34" />
      </svg>
    </span>
  );
}
