import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// Two ways to run the AI, whichever is set up:
// 1. GOOGLE_GENERATIVE_AI_API_KEY: a free Gemini key from Google AI Studio (no card needed).
// 2. Otherwise the Vercel AI Gateway (needs a card on the Vercel account; free monthly credits).
// Google retires model names over time, so we try a short list and use the first one that exists.
const GEMINI_MODELS = [process.env.VERSENOTE_GEMINI_MODEL, "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.7-flash", "gemini-3.5-flash-lite"].filter(Boolean) as string[];
const GATEWAY_MODELS = [process.env.VERSENOTE_AI_MODEL, "google/gemini-3.8-flash", "google/gemini-3.7-flash"].filter(Boolean) as string[];

function candidates(): { model: LanguageModel; name: string }[] {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (key) {
    const google = createGoogleGenerativeAI({ apiKey: key });
    return GEMINI_MODELS.map((m) => ({ model: google(m), name: m }));
  }
  return GATEWAY_MODELS.map((m) => ({ model: m, name: m }));
}

let working: number | null = null; // remembered per server instance

function isModelGone(e: unknown): boolean {
  const s = String((e as { message?: string })?.message ?? e) + String((e as { responseBody?: string })?.responseBody ?? "");
  return /no longer available|not found|NOT_FOUND|is not supported|404/i.test(s);
}

/** Run an AI call, moving on to the next model name if Google says one is gone. */
export async function withModel<T>(run: (model: LanguageModel) => Promise<T>): Promise<{ result: T; name: string }> {
  const list = candidates();
  const order = working !== null ? [working, ...[...list.keys()].filter((i) => i !== working)] : [...list.keys()];
  let last: unknown;
  for (const i of order) {
    try {
      const result = await run(list[i].model);
      working = i;
      return { result, name: list[i].name };
    } catch (e) {
      last = e;
      if (!isModelGone(e)) throw e;
    }
  }
  throw last;
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
