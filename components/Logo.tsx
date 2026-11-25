// VerseNote mark: an open Bible with a note rising from its pages (the Word, and your notes on it).
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g stroke="currentColor" strokeWidth="3.4">
        <path d="M32 50 C 25 43.5, 15 41.5, 5 43.5 L 5 26.5 C 15 24.5, 25 26.5, 32 33" />
        <path d="M32 50 C 39 43.5, 49 41.5, 59 43.5 L 59 36" />
        <path d="M32 33 V 50" />
      </g>
      <path
        d="M33.5 31.5 C 35 20.5, 45 12.5, 58.5 13.5 C 60 26, 51.5 33.5, 41 33.5 L 36.5 37.5 L 37.5 32.6"
        stroke="var(--coral)"
        strokeWidth="3.4"
        fill="var(--coral)"
        fillOpacity="0.14"
      />
      <path d="M43 22.5 H 52 M43 27 H 48.5" stroke="var(--coral)" strokeWidth="2.8" />
    </svg>
  );
}

export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">
        Verse<span>Note</span>
      </span>
    </span>
  );
}
