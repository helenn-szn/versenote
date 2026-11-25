// Original silhouette: hills, trees and churches from around the world
// (steeple chapel, village chapel, domed church, twin-tower cathedral) with a rising sun.
export default function Skyline() {
  const F = "var(--footer-bg)";
  const tree = (x: number, y: number, r: number) => (
    <g key={`${x}-${y}`} fill={F}>
      <circle cx={x} cy={y} r={r} />
      <circle cx={x - r * 0.7} cy={y + r * 0.45} r={r * 0.75} />
      <circle cx={x + r * 0.7} cy={y + r * 0.4} r={r * 0.8} />
      <rect x={x - 2} y={y + r * 0.6} width="4" height={r * 1.4} />
    </g>
  );
  return (
    <svg className="skyline" viewBox="0 0 1440 190" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {/* rising sun */}
      <circle cx="720" cy="170" r="120" fill="var(--coral)" opacity="0.9" />
      <circle cx="720" cy="170" r="160" fill="var(--coral)" opacity="0.14" />

      {/* hills */}
      <path
        fill={F}
        d="M0 150 C 90 128, 170 132, 250 146 C 330 160, 400 136, 480 138 C 560 140, 610 150, 680 148 C 760 146, 820 136, 900 140 C 980 144, 1040 160, 1120 150 C 1200 140, 1290 126, 1360 136 C 1400 142, 1430 146, 1440 146 L1440 190 L0 190Z"
      />

      {/* steeple chapel */}
      <g fill={F}>
        <rect x="236" y="104" width="72" height="50" />
        <polygon points="230,106 272,78 314,106" />
        <rect x="254" y="58" width="18" height="50" />
        <polygon points="250,60 263,26 276,60" />
        <rect x="261.5" y="12" width="3" height="16" />
        <rect x="256" y="17" width="14" height="3" />
      </g>
      <rect x="278" y="120" width="10" height="16" rx="5" fill="var(--footer-window)" />

      {/* village chapel */}
      <g fill={F}>
        <rect x="470" y="118" width="54" height="34" />
        <polygon points="464,120 497,96 530,120" />
        <rect x="495.5" y="82" width="3" height="16" />
        <rect x="490" y="87" width="14" height="3" />
      </g>

      {/* domed church (centre) */}
      <g fill={F}>
        <rect x="660" y="112" width="120" height="44" />
        <path d="M676 114 C 676 74, 764 74, 764 114Z" />
        <rect x="714" y="60" width="12" height="18" />
        <rect x="718.5" y="40" width="3" height="20" />
        <rect x="713" y="46" width="14" height="3" />
        <rect x="644" y="124" width="26" height="32" />
        <rect x="770" y="124" width="26" height="32" />
      </g>
      <rect x="712" y="128" width="16" height="24" rx="8" fill="var(--footer-window)" />

      {/* twin-tower cathedral */}
      <g fill={F}>
        <rect x="1090" y="104" width="100" height="50" />
        <polygon points="1084,106 1140,80 1196,106" />
        <rect x="1076" y="64" width="26" height="90" />
        <rect x="1178" y="64" width="26" height="90" />
        <polygon points="1072,66 1089,36 1106,66" />
        <polygon points="1174,66 1191,36 1208,66" />
        <rect x="1138.5" y="62" width="3" height="18" />
        <rect x="1133" y="68" width="14" height="3" />
      </g>
      <circle cx="1140" cy="118" r="8" fill="var(--footer-window)" />

      {/* trees */}
      {[
        [70, 120, 14],
        [118, 126, 10],
        [190, 118, 16],
        [370, 124, 13],
        [410, 116, 17],
        [580, 122, 14],
        [612, 128, 9],
        [860, 120, 15],
        [900, 112, 19],
        [960, 124, 12],
        [1010, 118, 15],
        [1260, 112, 18],
        [1306, 120, 13],
        [1370, 116, 16],
        [1410, 124, 11],
      ].map(([x, y, r]) => tree(x, y, r))}
    </svg>
  );
}
