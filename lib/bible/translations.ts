// Free-to-use translations only (public domain or open licence), so the app is free to use and share.
// "api" texts come from bible-api.com; "local" texts are bundled in data/bibles (one JSON file per book).
// To add NIV/NKJV/NLT/ESV later, a licensed API (API.Bible, api.esv.org) is needed.
export type Lang = "en" | "fr" | "es" | "pt" | "sw" | "ko" | "zh";

export const TRANSLATIONS = [
  { id: "KJV", lang: "en", source: "api", apiId: "kjv", name: "King James Version" },
  { id: "BSB", lang: "en", source: "api", apiId: "bsb", name: "Berean Standard Bible" },
  { id: "WEB", lang: "en", source: "api", apiId: "web", name: "World English Bible" },
  { id: "LSG", lang: "fr", source: "local", apiId: "", name: "Louis Segond 1910" },
  { id: "RV1909", lang: "es", source: "local", apiId: "", name: "Reina-Valera 1909" },
  { id: "BLIVRE", lang: "pt", source: "local", apiId: "", name: "Bíblia Livre" },
  { id: "SWC", lang: "sw", source: "local", apiId: "", name: "Kiswahili Contemporary Version" },
  { id: "KRV", lang: "ko", source: "local", apiId: "", name: "개역한글" },
  { id: "CUVS", lang: "zh", source: "local", apiId: "", name: "和合本 (简体)" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
export const DEFAULT_TRANSLATION: TranslationId = "KJV";

/** The Bible a language switch moves people to. */
export const BIBLE_FOR_LANG: Record<Lang, TranslationId> = {
  en: "KJV",
  fr: "LSG",
  es: "RV1909",
  pt: "BLIVRE",
  sw: "SWC",
  ko: "KRV",
  zh: "CUVS",
};

export function toTranslation(value: unknown): TranslationId {
  return TRANSLATIONS.some((t) => t.id === value) ? (value as TranslationId) : DEFAULT_TRANSLATION;
}

export function translationLang(id: string): Lang {
  return TRANSLATIONS.find((t) => t.id === id)?.lang ?? "en";
}
