// Original illustrations that match a sermon's topic, picked from words in its title.
// Flat shapes in the VerseNote palette (coral, brown, sand). No external images needed.

const C = "#D4492F"; // coral
const CD = "#B53D27"; // deep coral
const CL = "#F6B4A5"; // light coral
const B = "#8C6A50"; // brown
const BD = "#6C503B"; // dark brown
const BL = "#C9A17F"; // light brown
const W = "#FFFDFB";

type Motif =
  | "sunrise"
  | "water"
  | "growth"
  | "mountain"
  | "heart"
  | "dove"
  | "cross"
  | "path"
  | "shepherd"
  | "lamp"
  | "crown"
  | "book";

const KEYWORDS: [Motif, RegExp][] = [
  ["shepherd", /shepherd|sheep|flock|lamb|pasture|psalm 23/],
  ["dove", /peace|spirit|dove|pentecost|rest|comfort|calm/],
  ["water", /water|baptis|river|sea|storm|wave|well|thirst|rain|flood|ocean|jordan/],
  ["growth", /seed|grow|harvest|fruit|sow|root|vine|branch|plant|tree|garden|bloom/],
  ["mountain", /mountain|rock|strength|strong|climb|refuge|fortress|sinai|giant|overcom|moses/],
  ["heart", /love|heart|compassion|forgiv|mercy|kind|grace|famil|marriage|friend/],
  ["cross", /cross|salvation|redeem|redempt|calvary|blood|sacrific|saviou?r|jesus|christ|good friday/],
  ["path", /path|journey|walk|way|road|follow|step|wilderness|direction|purpose|calling/],
  ["lamp", /light|lamp|shine|dark|candle|word|truth|wisdom|prayer|pray/],
  ["crown", /king|crown|reign|throne|victory|glory|majesty|royal|kingdom/],
  ["sunrise", /new|begin|dawn|hope|morning|resurrect|risen|easter|joy|fresh|renew|future|season/],
];

export function motifFor(title: string): Motif {
  const t = title.toLowerCase();
  for (const [m, re] of KEYWORDS) if (re.test(t)) return m;
  return "book";
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BACKGROUNDS = ["#FDEDE9", "#F7EDE4", "#FBE6DC", "#F3E7DB"];

function Sun({ x, y, r, color = C }: { x: number; y: number; r: number; color?: string }) {
  return <circle cx={x} cy={y} r={r} fill={color} />;
}

function Motifs({ motif, v }: { motif: Motif; v: number }) {
  switch (motif) {
    case "sunrise":
      return (
        <g>
          <g stroke={CL} strokeWidth="7" strokeLinecap="round">
            {[-75, -50, -25, 0, 25, 50, 75].map((a) => {
              const rad = ((a - 90) * Math.PI) / 180;
              return <line key={a} x1={200 + Math.cos(rad) * 78} y1={175 + Math.sin(rad) * 78} x2={200 + Math.cos(rad) * 112} y2={175 + Math.sin(rad) * 112} />;
            })}
          </g>
          <Sun x={200} y={175} r={60} />
          <path d="M0 190 C 90 160, 150 175, 210 192 C 280 212, 340 180, 400 172 L400 240 L0 240Z" fill={BL} />
          <path d="M0 214 C 110 190, 220 222, 400 200 L400 240 L0 240Z" fill={B} />
        </g>
      );
    case "water":
      return (
        <g>
          <Sun x={v % 2 ? 300 : 110} y={78} r={34} color={CL} />
          {[
            { y: 128, c: CL, dx: 0 },
            { y: 160, c: C, dx: -25 },
            { y: 194, c: CD, dx: -12 },
          ].map(({ y, c, dx }, i) => (
            <path
              key={i}
              d={`M${-50 + dx} ${y} ${Array.from({ length: 10 }, (_, k) => `Q ${-25 + dx + k * 50} ${y - 16} ${dx + k * 50} ${y}`).join(" ")} L450 ${y} L450 240 L-50 240Z`}
              fill={c}
            />
          ))}
        </g>
      );
    case "growth":
      return (
        <g>
          <Sun x={v % 2 ? 318 : 84} y={70} r={30} color={CL} />
          <path d="M0 196 C 120 182, 280 184, 400 196 L400 240 L0 240Z" fill={B} />
          <path d="M200 196 C 200 170, 198 140, 202 104" stroke={BD} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M201 150 C 170 150, 146 130, 140 102 C 172 100, 196 120, 201 150Z" fill={C} />
          <path d="M202 126 C 230 126, 256 106, 262 76 C 228 76, 204 96, 202 126Z" fill={CD} />
          <path d="M202 104 C 194 90, 196 74, 206 62 C 214 76, 212 92, 202 104Z" fill={C} />
          <ellipse cx="200" cy="198" rx="40" ry="7" fill={BD} opacity="0.35" />
        </g>
      );
    case "mountain":
      return (
        <g>
          <Sun x={340} y={58} r={28} />
          <path d="M-10 220 L120 92 L190 160 L260 70 L410 220Z" fill={BL} />
          <path d="M260 70 L290 100 L272 96 L260 108 L246 94 L232 98Z" fill={W} />
          <path d="M-10 230 L90 140 L170 205 L250 120 L410 230Z" fill={B} />
          <path d="M0 240 L0 214 C 120 200, 280 206, 400 220 L400 240Z" fill={BD} />
        </g>
      );
    case "heart":
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={70 + i * 52} cy={i % 2 ? 60 : 190} r={4 + (i % 3)} fill={CL} />
          ))}
          <path
            d="M200 200 C 140 160, 108 128, 112 94 C 116 64, 156 52, 182 74 L200 90 L218 74 C 244 52, 284 64, 288 94 C 292 128, 260 160, 200 200Z"
            fill={C}
          />
          <path d="M200 182 C 156 150, 134 126, 136 100 C 138 82, 158 74, 174 84" stroke={W} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M0 220 C 140 206, 260 230, 400 214 L400 240 L0 240Z" fill={B} opacity="0.5" />
        </g>
      );
    case "dove":
      return (
        <g>
          <circle cx="200" cy="118" r="88" fill={CL} opacity="0.55" />
          <path d="M120 150 C 150 112, 210 104, 250 124 L292 108 L270 134 C 270 166, 226 180, 186 170 L150 186 L164 162 C 148 162, 132 158, 120 150Z" fill={W} stroke={BD} strokeWidth="4" strokeLinejoin="round" />
          <path d="M200 128 C 206 90, 236 66, 280 60 C 270 98, 246 122, 214 136Z" fill={W} stroke={BD} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="262" cy="124" r="3.5" fill={BD} />
          <path d="M292 108 C 304 108, 316 114, 322 122" stroke={B} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M310 112 C 316 104, 326 102, 332 106 C 326 112, 318 114, 310 112Z M316 122 C 324 118, 334 120, 338 126 C 330 130, 322 128, 316 122Z" fill={C} />
        </g>
      );
    case "cross":
      return (
        <g>
          <Sun x={200} y={140} r={78} color={CL} />
          <path d="M0 214 C 120 170, 280 170, 400 214 L400 240 L0 240Z" fill={B} />
          <rect x="192" y="58" width="16" height="132" rx="3" fill={BD} />
          <rect x="160" y="88" width="80" height="15" rx="3" fill={BD} />
        </g>
      );
    case "path":
      return (
        <g>
          <Sun x={v % 2 ? 300 : 100} y={64} r={26} />
          <path d="M0 120 C 100 100, 300 100, 400 120 L400 240 L0 240Z" fill={BL} />
          <path d="M150 240 C 170 200, 260 190, 230 160 C 205 136, 170 140, 200 118 L 212 118 C 190 140, 236 140, 256 160 C 290 196, 220 210, 250 240Z" fill={W} opacity="0.95" />
          <path d="M200 240 C 214 210, 250 196, 236 166 C 222 146, 196 140, 206 120" stroke={C} strokeWidth="4" strokeDasharray="10 10" fill="none" strokeLinecap="round" />
          <path d="M0 160 C 60 150, 100 160, 130 176 L130 240 L0 240Z" fill={B} opacity="0.55" />
          <path d="M400 168 C 340 160, 300 170, 280 186 L280 240 L400 240Z" fill={B} opacity="0.55" />
        </g>
      );
    case "shepherd":
      return (
        <g>
          <Sun x={84} y={66} r={28} color={CL} />
          <path d="M0 176 C 120 150, 280 160, 400 180 L400 240 L0 240Z" fill={BL} />
          <path d="M0 206 C 140 190, 260 196, 400 210 L400 240 L0 240Z" fill={B} />
          <path d="M290 214 L290 92 C 290 68, 320 64, 324 86" stroke={BD} strokeWidth="7" fill="none" strokeLinecap="round" />
          {[
            [160, 168],
            [228, 180],
          ].map(([x, y], i) => (
            <g key={i}>
              <g stroke={BD} strokeWidth="4" strokeLinecap="round">
                <line x1={x - 12} y1={y + 14} x2={x - 12} y2={y + 30} />
                <line x1={x + 12} y1={y + 14} x2={x + 12} y2={y + 30} />
              </g>
              <g fill={W} stroke={BD} strokeWidth="3">
                <circle cx={x - 16} cy={y} r="15" />
                <circle cx={x} cy={y - 8} r="17" />
                <circle cx={x + 16} cy={y} r="15" />
                <circle cx={x} cy={y + 8} r="15" />
              </g>
              <ellipse cx={x + 32} cy={y - 6} rx="11" ry="9" fill={BD} />
            </g>
          ))}
        </g>
      );
    case "lamp":
      return (
        <g>
          <circle cx="200" cy="96" r="78" fill={CL} opacity="0.35" />
          <circle cx="200" cy="96" r="46" fill={CL} opacity="0.55" />
          <path d="M200 50 C 182 72, 182 98, 200 116 C 218 98, 218 72, 200 50Z" fill={C} />
          <path d="M200 76 C 192 88, 192 102, 200 112 C 208 102, 208 88, 200 76Z" fill={W} opacity="0.85" />
          <line x1="200" y1="116" x2="200" y2="126" stroke={BD} strokeWidth="4" strokeLinecap="round" />
          <rect x="178" y="126" width="44" height="76" rx="6" fill={W} stroke={BD} strokeWidth="4" />
          <path d="M150 204 H 250" stroke={BD} strokeWidth="8" strokeLinecap="round" />
        </g>
      );
    case "crown":
      return (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M${60 + i * 48} ${i % 2 ? 54 : 200} l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z`} fill={CL} />
          ))}
          <path d="M126 176 L114 86 L162 128 L200 72 L238 128 L286 86 L274 176Z" fill={C} stroke={CD} strokeWidth="5" strokeLinejoin="round" />
          <rect x="122" y="172" width="156" height="24" rx="5" fill={CD} />
          {[114, 200, 286].map((x, i) => (
            <circle key={i} cx={x} cy={i === 1 ? 70 : 84} r="9" fill={W} stroke={CD} strokeWidth="4" />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <g stroke={CL} strokeWidth="6" strokeLinecap="round">
            {[-60, -30, 0, 30, 60].map((a) => {
              const rad = ((a - 90) * Math.PI) / 180;
              return <line key={a} x1={200 + Math.cos(rad) * 70} y1={150 + Math.sin(rad) * 70} x2={200 + Math.cos(rad) * 104} y2={150 + Math.sin(rad) * 104} />;
            })}
          </g>
          <path d="M200 196 C 176 176, 140 170, 106 176 L106 116 C 140 110, 176 116, 200 136Z" fill={W} stroke={BD} strokeWidth="5" strokeLinejoin="round" />
          <path d="M200 196 C 224 176, 260 170, 294 176 L294 116 C 260 110, 224 116, 200 136Z" fill={W} stroke={BD} strokeWidth="5" strokeLinejoin="round" />
          <path d="M200 136 V 196" stroke={BD} strokeWidth="5" />
          <path d="M126 140 H 178 M126 156 H 172 M222 140 H 274 M228 156 H 274" stroke={C} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
  }
}

export default function SermonCover({
  title,
  className,
  rounded = 16,
}: {
  title: string;
  className?: string;
  rounded?: number;
}) {
  const motif = motifFor(title || "");
  const h = hash(title || "VerseNote");
  const bg = BACKGROUNDS[h % BACKGROUNDS.length];
  return (
    <svg
      className={className}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Illustration for ${title || "this sermon"}`}
      style={{ display: "block", width: "100%", height: "auto", borderRadius: rounded }}
    >
      <rect width="400" height="240" fill={bg} />
      <Motifs motif={motif} v={h} />
    </svg>
  );
}
