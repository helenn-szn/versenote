"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TRANSLATIONS, type TranslationId } from "@/lib/bible/translations";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Changing the translation also saves it as the member's default, so it follows them across devices.
export default function TranslationPicker({
  value,
  onChange,
  compact = false,
}: {
  value: TranslationId;
  onChange: (t: TranslationId) => void;
  compact?: boolean;
}) {
  const { t: dict } = useI18n();
  const supabase = useRef(createClient()).current;

  async function change(t: TranslationId) {
    onChange(t);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ preferred_translation: t }).eq("id", data.user.id);
  }

  return (
    <select
      className="input"
      style={compact ? { width: "auto", padding: "0.45rem 0.6rem", fontSize: "0.9rem" } : undefined}
      value={value}
      onChange={(e) => change(e.target.value as TranslationId)}
      aria-label={dict.bible.picker}
    >
      {LOCALES.map((lang) => (
        <optgroup key={lang} label={LOCALE_NAMES[lang]}>
          {TRANSLATIONS.filter((t) => t.lang === lang).map((t) => (
            <option key={t.id} value={t.id}>
              {compact ? t.id : `${t.name} (${t.id})`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
