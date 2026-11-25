import { findBook } from "./books.ts";

export type Reference = {
  book: string;
  chapter: number;
  verseStart?: number; // undefined = whole chapter
  verseEnd?: number;
};

// "Genesis 1:1", "John 3:16-18", "Psalms 23"
export function formatReference(r: Reference): string {
  if (r.verseStart === undefined) return `${r.book} ${r.chapter}`;
  if (r.verseEnd !== undefined && r.verseEnd !== r.verseStart) return `${r.book} ${r.chapter}:${r.verseStart}-${r.verseEnd}`;
  return `${r.book} ${r.chapter}:${r.verseStart}`;
}

// ---- Number words, so spoken references work too ("Romans eight twenty-eight") ----
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function wordsToNumbers(text: string): string {
  const tokens = text.split(/(\s+|-)/);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i].toLowerCase();
    if (t in UNITS || t in TENS || t === "hundred") {
      let value = 0;
      let current = 0;
      let consumed = i;
      let j = i;
      let last: "unit" | "teen" | "tens" | "hundred" | null = null;
      while (j < tokens.length) {
        const w = tokens[j].toLowerCase();
        if (/^(\s+|-)$/.test(tokens[j]) || (w === "and" && last === "hundred")) { j++; continue; }
        // A new number starts when words can't combine: "four thirteen" is 4 then 13.
        if (w in UNITS) {
          const n = UNITS[w];
          const isUnit = n >= 1 && n <= 9;
          if (last === "unit" || last === "teen" || (last === "tens" && !isUnit)) break;
          current += n;
          last = isUnit ? "unit" : "teen";
        } else if (w in TENS) {
          if (last === "unit" || last === "teen" || last === "tens") break;
          current += TENS[w];
          last = "tens";
        } else if (w === "hundred") {
          if (last !== "unit") break;
          current *= 100;
          last = "hundred";
        } else break;
        consumed = j;
        j++;
      }
      value += current;
      out.push(String(value));
      i = consumed + 1;
      // keep the whitespace that followed the number
      continue;
    }
    out.push(tokens[i]);
    i++;
  }
  return out.join("");
}

function build(bookRaw: string, ch: string, v1?: string, v2?: string): Reference | null {
  const book = findBook(bookRaw);
  if (!book) return null;
  const chapter = parseInt(ch, 10);
  if (!chapter || chapter > book.chapters) return null;
  const verseStart = v1 ? parseInt(v1, 10) : undefined;
  let verseEnd = v2 ? parseInt(v2, 10) : undefined;
  if (verseStart !== undefined && (verseStart < 1 || verseStart > 176)) return null;
  if (verseEnd !== undefined && verseStart !== undefined && verseEnd < verseStart) verseEnd = undefined;
  return { book: book.name, chapter, verseStart, verseEnd };
}

// A book name: an optional number, then one to four words in any script ("Jean", "Mambo ya Walawi", "约翰福音").
const BOOK_PART = String.raw`((?:(?:[123]|i{1,3}|first|second|third|1st|2nd|3rd)\s*)?\p{L}+\.?(?:\s+\p{L}+\.?){0,3}?)`;
const CHAPTER_WORD = String.raw`(?:chapter|chapitre|cap[ií]tulo|sura)`;
const VERSE_WORD = String.raw`(?:verses?|vs?\.?|versets?|vers[ií]culos?|mstari|aya)`;
const RANGE = String.raw`(?:\s*(?:-|–|—|~|to|through|thru|à|a|hasta|até|hadi)\s*(\d+))?`;

// Forms like "Gen 1:1", "John 3:16-18", "Romans 8 28", "Rom 8v28"
const NUMERIC = new RegExp(String.raw`^${BOOK_PART}\s*(\d+)\s*(?::|：|v|\s|\.|,)\s*(\d+)${RANGE}$`, "iu");
// Korean and Chinese: "요한복음 3장 16절", "约翰福音3章16节"
const CJK = new RegExp(String.raw`^${BOOK_PART}\s*(\d+)\s*[章장]\s*(\d+)\s*[节節절]?${RANGE}\s*[节節절]?$`, "iu");
// "Romans chapter 8 verse 28", "Romans 8 verse 28 to 30"
const SPOKEN = new RegExp(
  String.raw`^${BOOK_PART}\s+(?:${CHAPTER_WORD}\s+)?(\d+)\s*,?\s*${VERSE_WORD}\s+(\d+)${RANGE}$`,
  "iu"
);
// "Psalm 23", "Psalm chapter 23"
const CHAPTER_ONLY = new RegExp(String.raw`^${BOOK_PART}\s*(?:${CHAPTER_WORD}\s+)?(\d+)\s*[章장]?$`, "iu");

/** Parse a whole string as a reference. Returns null if it isn't one. */
export function parseReference(input: string): Reference | null {
  const s = wordsToNumbers(input.trim().replace(/[,;!?]+$/, "")).replace(/\s+/g, " ");
  let m = s.match(SPOKEN);
  if (m) return build(m[1], m[2], m[3], m[4]);
  m = s.match(NUMERIC);
  if (m) return build(m[1], m[2], m[3], m[4]);
  m = s.match(CJK);
  if (m) return build(m[1], m[2], m[3], m[4]);
  m = s.match(CHAPTER_ONLY);
  if (m) return build(m[1], m[2]);
  return null;
}

/**
 * Look for a reference at the very end of some text (what the user just typed).
 * Needs a verse number so that ordinary words like "mark 2" or "acts 3" don't trigger it.
 * Returns the reference and where it starts in the text so it can be replaced by a card.
 */
export function findReferenceAtEnd(text: string): { ref: Reference; start: number } | null {
  const trimmed = text.replace(/[\s.,;!?]+$/, "");
  if (!/\d$/.test(trimmed)) return null;
  // Try progressively longer tails, up to 8 words, preferring the longest valid match.
  const words = trimmed.split(/(?<=\s)/);
  let best: { ref: Reference; start: number } | null = null;
  for (let n = 2; n <= Math.min(10, words.length); n++) {
    const tail = words.slice(words.length - n).join("");
    if (!/[:：v章장]\s*\d|\bverses?\b|versets?|vers[ií]culos?|mstari|\d\s+\d/i.test(tail)) continue;
    const ref = parseReference(tail);
    if (ref && ref.verseStart !== undefined) best = { ref, start: trimmed.length - tail.length };
  }
  if (best) return best;
  // Single token like "Gen1:1", or Chinese with no spaces: "我们读约翰福音3:16" (try shorter starts)
  const last = words[words.length - 1];
  for (let k = 0; k < Math.min(last.length - 2, 16); k++) {
    const piece = last.slice(k);
    const ref = parseReference(piece);
    if (ref && ref.verseStart !== undefined) return { ref, start: trimmed.length - piece.length };
  }
  return null;
}
