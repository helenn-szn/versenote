import { formatReference, parseReference, type Reference } from "./parse.ts";
import { TRANSLATIONS, type TranslationId } from "./translations.ts";

export type Passage = {
  reference: string; // "John 3:16-18"
  translation: TranslationId; // "KJV" | "BSB" | "WEB"
  verses: { verse: number; text: string }[];
};

// Scripture comes from a Bible source, never from AI.
// Source: bible-api.com (free, rate-limited), serving public-domain translations.
export async function fetchPassage(ref: Reference, translation: TranslationId): Promise<Passage | null> {
  const t = TRANSLATIONS.find((x) => x.id === translation)!;
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
    reference: query,
    translation: t.id,
    verses: data.verses.map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() })),
  };
}

export { parseReference, formatReference };
