export const LOCALES = ["en", "fr", "es", "pt", "sw", "ko", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "vn_lang";

// Each language named in itself, so people can find their own.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
  sw: "Kiswahili",
  ko: "한국어",
  zh: "中文",
};

// For <html lang> and for dates.
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  sw: "sw-KE",
  ko: "ko-KR",
  zh: "zh-CN",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Pick a language from an Accept-Language header, e.g. "fr-CA,fr;q=0.9,en;q=0.8". */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

/** Fill {placeholders}: fmt("{n} joined", { n: 3 }) -> "3 joined". */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
