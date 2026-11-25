"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { BIBLE_FOR_LANG } from "@/lib/bible/translations";

// Switching language also moves a signed-in member's Bible to that language,
// so the website and the verses change together.
export default function LanguageSwitcher({ signedIn }: { signedIn: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  async function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    if (signedIn) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("profiles").update({ preferred_translation: BIBLE_FOR_LANG[next] }).eq("id", data.user.id);
      }
    }
    start(() => router.refresh());
  }

  return (
    <label className={`lang-switch ${pending ? "busy" : ""}`} title={t.nav.language}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </svg>
      <span className="lang-name" aria-hidden>{LOCALE_NAMES[locale]}</span>
      <span className="lang-code" aria-hidden>{locale.toUpperCase()}</span>
      <svg className="lang-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <select value={locale} onChange={(e) => change(e.target.value as Locale)} aria-label={t.nav.language}>
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
