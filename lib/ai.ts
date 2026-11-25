// AI runs through the Vercel AI Gateway. On Vercel it authenticates automatically (OIDC);
// elsewhere set AI_GATEWAY_API_KEY. The model can be changed with VERSENOTE_AI_MODEL.
export const AI_MODEL = process.env.VERSENOTE_AI_MODEL || "google/gemini-2.5-flash";

export function aiAvailable(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  sw: "Swahili",
  ko: "Korean",
  zh: "Simplified Chinese",
};
