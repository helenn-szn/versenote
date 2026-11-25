import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// Two ways to run the AI, whichever is set up:
// 1. GOOGLE_GENERATIVE_AI_API_KEY: a free Gemini key from Google AI Studio (no card needed).
// 2. Otherwise the Vercel AI Gateway (needs a card on the Vercel account; free monthly credits).
const GEMINI_MODEL = process.env.VERSENOTE_GEMINI_MODEL || "gemini-2.5-flash";
const GATEWAY_MODEL = process.env.VERSENOTE_AI_MODEL || "google/gemini-2.5-flash";

export function aiModel(): { model: LanguageModel; name: string } {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (key) return { model: createGoogleGenerativeAI({ apiKey: key })(GEMINI_MODEL), name: GEMINI_MODEL };
  return { model: GATEWAY_MODEL, name: GATEWAY_MODEL };
}

export function aiAvailable(): boolean {
  return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

/** Billing/setup problems (e.g. the gateway asking for a card) are "AI is off", not a temporary failure. */
export function isSetupError(e: unknown): boolean {
  const s = String((e as { message?: string })?.message ?? e) + JSON.stringify((e as { data?: unknown })?.data ?? "");
  return /credit card|customer_verification|api key|API_KEY_INVALID|PERMISSION_DENIED|unauthori[sz]ed|403/i.test(s);
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
