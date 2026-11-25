import { LOCALE_TAGS, type Locale } from "./i18n/config";

// Sermon dates are stored as plain dates (YYYY-MM-DD); format them without timezone shifts.
export function formatDate(d: string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "";
  const date = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(LOCALE_TAGS[locale], { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}
