import { BOOK_NAMES, SHORT_NAMES } from "./bookNames.ts";
import type { Lang } from "./translations.ts";

// The 66 books, with chapter counts and the ways people write or say them.
// Aliases are matched after lower-casing and removing spaces and dots.
export type Book = { name: string; chapters: number; aliases: string[] };

export const BOOKS: Book[] = [
  { name: "Genesis", chapters: 50, aliases: ["gen", "ge", "gn"] },
  { name: "Exodus", chapters: 40, aliases: ["exod", "exo", "ex"] },
  { name: "Leviticus", chapters: 27, aliases: ["lev", "le", "lv"] },
  { name: "Numbers", chapters: 36, aliases: ["num", "nu", "nm", "nb"] },
  { name: "Deuteronomy", chapters: 34, aliases: ["deut", "deu", "dt"] },
  { name: "Joshua", chapters: 24, aliases: ["josh", "jos", "jsh"] },
  { name: "Judges", chapters: 21, aliases: ["judg", "jdg", "jg", "jdgs"] },
  { name: "Ruth", chapters: 4, aliases: ["rth", "ru"] },
  { name: "1 Samuel", chapters: 31, aliases: ["1sam", "1sa", "1sm", "1s"] },
  { name: "2 Samuel", chapters: 24, aliases: ["2sam", "2sa", "2sm", "2s"] },
  { name: "1 Kings", chapters: 22, aliases: ["1kgs", "1ki", "1kin", "1k"] },
  { name: "2 Kings", chapters: 25, aliases: ["2kgs", "2ki", "2kin", "2k"] },
  { name: "1 Chronicles", chapters: 29, aliases: ["1chron", "1chr", "1ch"] },
  { name: "2 Chronicles", chapters: 36, aliases: ["2chron", "2chr", "2ch"] },
  { name: "Ezra", chapters: 10, aliases: ["ezr", "ez"] },
  { name: "Nehemiah", chapters: 13, aliases: ["neh", "ne"] },
  { name: "Esther", chapters: 10, aliases: ["esth", "est", "es"] },
  { name: "Job", chapters: 42, aliases: ["jb"] },
  { name: "Psalms", chapters: 150, aliases: ["psalm", "psa", "ps", "pss", "psm"] },
  { name: "Proverbs", chapters: 31, aliases: ["prov", "pro", "prv", "pr"] },
  { name: "Ecclesiastes", chapters: 12, aliases: ["eccles", "eccl", "ecc", "ec", "qoh"] },
  { name: "Song of Solomon", chapters: 8, aliases: ["songofsongs", "song", "sos", "so", "canticles", "sng"] },
  { name: "Isaiah", chapters: 66, aliases: ["isa", "is"] },
  { name: "Jeremiah", chapters: 52, aliases: ["jer", "je", "jr"] },
  { name: "Lamentations", chapters: 5, aliases: ["lam", "la"] },
  { name: "Ezekiel", chapters: 48, aliases: ["ezek", "eze", "ezk"] },
  { name: "Daniel", chapters: 12, aliases: ["dan", "da", "dn"] },
  { name: "Hosea", chapters: 14, aliases: ["hos", "ho"] },
  { name: "Joel", chapters: 3, aliases: ["jl"] },
  { name: "Amos", chapters: 9, aliases: ["am"] },
  { name: "Obadiah", chapters: 1, aliases: ["obad", "ob"] },
  { name: "Jonah", chapters: 4, aliases: ["jnh", "jon"] },
  { name: "Micah", chapters: 7, aliases: ["mic", "mc"] },
  { name: "Nahum", chapters: 3, aliases: ["nah", "na"] },
  { name: "Habakkuk", chapters: 3, aliases: ["hab", "hb"] },
  { name: "Zephaniah", chapters: 3, aliases: ["zeph", "zep", "zp"] },
  { name: "Haggai", chapters: 2, aliases: ["hag", "hg"] },
  { name: "Zechariah", chapters: 14, aliases: ["zech", "zec", "zc"] },
  { name: "Malachi", chapters: 4, aliases: ["mal", "ml"] },
  { name: "Matthew", chapters: 28, aliases: ["matt", "mat", "mt"] },
  { name: "Mark", chapters: 16, aliases: ["mrk", "mar", "mk", "mr"] },
  { name: "Luke", chapters: 24, aliases: ["luk", "lk"] },
  { name: "John", chapters: 21, aliases: ["joh", "jhn", "jn"] },
  { name: "Acts", chapters: 28, aliases: ["act", "ac"] },
  { name: "Romans", chapters: 16, aliases: ["rom", "ro", "rm"] },
  { name: "1 Corinthians", chapters: 16, aliases: ["1cor", "1co"] },
  { name: "2 Corinthians", chapters: 13, aliases: ["2cor", "2co"] },
  { name: "Galatians", chapters: 6, aliases: ["gal", "ga"] },
  { name: "Ephesians", chapters: 6, aliases: ["eph", "ephes"] },
  { name: "Philippians", chapters: 4, aliases: ["phil", "php", "pp"] },
  { name: "Colossians", chapters: 4, aliases: ["col", "co"] },
  { name: "1 Thessalonians", chapters: 5, aliases: ["1thess", "1thes", "1th"] },
  { name: "2 Thessalonians", chapters: 3, aliases: ["2thess", "2thes", "2th"] },
  { name: "1 Timothy", chapters: 6, aliases: ["1tim", "1ti"] },
  { name: "2 Timothy", chapters: 4, aliases: ["2tim", "2ti"] },
  { name: "Titus", chapters: 3, aliases: ["tit", "ti"] },
  { name: "Philemon", chapters: 1, aliases: ["philem", "phm", "pm"] },
  { name: "Hebrews", chapters: 13, aliases: ["heb"] },
  { name: "James", chapters: 5, aliases: ["jas", "jm"] },
  { name: "1 Peter", chapters: 5, aliases: ["1pet", "1pe", "1pt", "1p"] },
  { name: "2 Peter", chapters: 3, aliases: ["2pet", "2pe", "2pt", "2p"] },
  { name: "1 John", chapters: 5, aliases: ["1john", "1jn", "1jhn", "1jo", "1j"] },
  { name: "2 John", chapters: 1, aliases: ["2john", "2jn", "2jhn", "2jo", "2j"] },
  { name: "3 John", chapters: 1, aliases: ["3john", "3jn", "3jhn", "3jo", "3j"] },
  { name: "Jude", chapters: 1, aliases: ["jud", "jd"] },
  { name: "Revelation", chapters: 22, aliases: ["revelations", "rev", "re", "rv", "apocalypse"] },
];

// Lower-case, drop accents, spaces and dots: "Ésaïe" -> "esaie", "1 Jean" -> "1jean".
export function normalizeBookKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s.]/g, "");
}

const LOOKUP = new Map<string, Book>();
for (const b of BOOKS) {
  LOOKUP.set(normalizeBookKey(b.name), b);
  for (const a of b.aliases) LOOKUP.set(a, b);
}
// Names in other languages. English keeps priority where a spelling is shared.
for (const list of [...Object.values(BOOK_NAMES), ...Object.values(SHORT_NAMES)]) {
  list?.forEach((name, i) => {
    const key = normalizeBookKey(name);
    if (!LOOKUP.has(key)) LOOKUP.set(key, BOOKS[i]);
  });
}

/** "John" + "fr" -> "Jean". Falls back to the English name. */
export function localBookName(englishName: string, lang: Lang): string {
  if (lang === "en") return englishName;
  const i = BOOKS.findIndex((b) => b.name === englishName);
  return (i >= 0 && BOOK_NAMES[lang][i]) || englishName;
}

const ORDINALS: Record<string, string> = {
  first: "1", "1st": "1", i: "1", one: "1",
  second: "2", "2nd": "2", ii: "2", two: "2",
  third: "3", "3rd": "3", iii: "3", three: "3",
};

// "1 Cor", "First Corinthians", "II Kings", "Gen." -> Book
export function findBook(raw: string): Book | undefined {
  let s = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^(the )?(book of |gospel of |gospel according to )/, "");
  const plain = LOOKUP.get(s.replace(/\s/g, ""));
  if (plain) return plain; // "Isa" is Isaiah, not "I Sa(muel)"
  const m = s.match(/^(first|second|third|1st|2nd|3rd|iii|ii|i|one|two|three|[123])\s*(.+)$/);
  if (m && ORDINALS[m[1]] !== undefined) {
    const numbered = LOOKUP.get(ORDINALS[m[1]] + m[2].replace(/\s/g, ""));
    if (numbered) return numbered;
  }
  if (m && /^[123]$/.test(m[1])) {
    const numbered = LOOKUP.get(m[1] + m[2].replace(/\s/g, ""));
    if (numbered) return numbered;
  }
  return LOOKUP.get(s.replace(/\s/g, ""));
}
