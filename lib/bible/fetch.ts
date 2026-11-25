import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatReference, parseReference, type Reference } from "./parse.ts";
import { BOOKS, localBookName } from "./books.ts";
import { TRANSLATIONS, type TranslationId } from "./translations.ts";

export type Passage = {
  reference: string; // "John 3:16-18", or "Jean 3:16-18" in a French Bible
  translation: TranslationId;
  verses: { verse: number; text: string }[];
};

type BookFile = { c: Record<string, [number, string][]> };
const bookCache = new Map<string, BookFile>();

// Bundled Bibles: data/bibles/{ID}/{book number}.json, e.g. LSG/43.json is John in Louis Segond.
async function loadBook(id: string, bookNumber: number): Promise<BookFile | null> {
  const key = `${id}/${bookNumber}`;
  const hit = bookCache.get(key);
  if (hit) return hit;
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "bibles", id, `${bookNumber}.json`), "utf8");
    const file = JSON.parse(raw) as BookFile;
    if (bookCache.size > 60) bookCache.clear();
    bookCache.set(key, file);
    return file;
  } catch {
    return null;
  }
}

// Scripture comes from a Bible text, never from AI.
export async function fetchPassage(ref: Reference, translation: TranslationId): Promise<Passage | null> {
  const t = TRANSLATIONS.find((x) => x.id === translation)!;
  const label = formatReference({ ...ref, book: localBookName(ref.book, t.lang) });

  if (t.source === "local") {
    const n = BOOKS.findIndex((b) => b.name === ref.book) + 1;
    const book = n > 0 ? await loadBook(t.id, n) : null;
    const chapter = book?.c[String(ref.chapter)];
    if (!chapter) return null;
    const from = ref.verseStart ?? 1;
    const to = ref.verseEnd ?? ref.verseStart ?? Infinity;
    const verses = chapter.filter(([v]) => v >= from && v <= to).map(([verse, text]) => ({ verse, text }));
    if (!verses.length) return null;
    return { reference: label, translation: t.id, verses };
  }

  // English texts: bible-api.com (free, rate-limited), serving public-domain translations.
  const query = formatReference(ref);
  const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${t.apiId}`, {
    next: { revalidate: 60 * 60 * 24 * 7 }, // Bible text doesn't change: cache for a week
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    verses?: { chapter: number; verse: number; text: string }[];
  };
  if (!data.verses?.length) return null;
  return {
    reference: label,
    translation: t.id,
    verses: data.verses.map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() })),
  };
}

export { parseReference, formatReference };
