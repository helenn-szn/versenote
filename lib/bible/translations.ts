// Public-domain translations only, so the app is free to use and share.
// To add NIV/NKJV/NLT/ESV later, a licensed API (API.Bible, api.esv.org) is needed.
export const TRANSLATIONS = [
  { id: "KJV", apiId: "kjv", name: "King James Version" },
  { id: "BSB", apiId: "bsb", name: "Berean Standard Bible" },
  { id: "WEB", apiId: "web", name: "World English Bible" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
export const DEFAULT_TRANSLATION: TranslationId = "KJV";

export function toTranslation(value: unknown): TranslationId {
  return TRANSLATIONS.some((t) => t.id === value) ? (value as TranslationId) : DEFAULT_TRANSLATION;
}
