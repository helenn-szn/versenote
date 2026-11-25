"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { fmt, LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { newId, type DraftQuestion, type SharedSermon } from "@/lib/types";

/** A bottom sheet on phones, a centred dialog on wider screens. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("textarea, input, button:not(.sheet-close)")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="sheet-grip" aria-hidden />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="✕">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------- Share ----------------
function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function ShareSheet({
  noteId,
  title,
  initialToken,
  plainText,
  onClose,
}: {
  noteId: string;
  title: string;
  initialToken: string | null;
  plainText: () => string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const S = t.share;
  const supabase = useRef(createClient()).current;
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const link = token ? `${window.location.origin}/n/${token}` : "";

  async function setSharing(on: boolean) {
    setBusy(true);
    setMsg("");
    const next = on ? makeToken() : null;
    const { error } = await supabase.from("notes").update({ share_token: next }).eq("id", noteId);
    setBusy(false);
    if (error) return setMsg(S.fail);
    setToken(next);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "VerseNote", url: link });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(link);
    setMsg(S.copied);
  }

  async function shareText() {
    const text = `${title ? `${title}\n\n` : ""}${plainText()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "VerseNote", text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setMsg(S.copiedText);
  }

  return (
    <Sheet title={S.title} onClose={onClose}>
      <label className="check sheet-row">
        <input type="checkbox" checked={!!token} disabled={busy} onChange={(e) => setSharing(e.target.checked)} />
        <span>
          <strong>{S.linkToggle}</strong>
          <span className="meta">{S.linkNote}</span>
        </span>
      </label>
      {token && (
        <div className="share-link">
          <input className="input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={S.title} />
          <button type="button" className="btn" onClick={shareLink}>
            {S.shareLink}
          </button>
        </div>
      )}
      <button type="button" className="btn secondary sheet-wide" onClick={shareText}>
        {S.shareText}
      </button>
      {msg && <p className="notice">{msg}</p>}
      <p className="meta sheet-foot">{S.privacy}</p>
    </Sheet>
  );
}

// ---------------- Translate ----------------
export function TranslateSheet({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const { locale, t } = useI18n();
  const T = t.translate;
  const router = useRouter();
  const [lang, setLang] = useState<Locale>(locale === "en" ? "fr" : "en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, lang }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.id) {
      setBusy(false);
      return setError(body.error === "ai_unavailable" ? t.rec.aiOff : T.fail);
    }
    router.push(`/notes/${body.id}`);
  }

  return (
    <Sheet title={T.title} onClose={onClose}>
      <p className="meta" style={{ marginTop: 0 }}>{T.intro}</p>
      <div className="lang-grid" role="radiogroup" aria-label={T.title}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={lang === l}
            className={`lang-option ${lang === l ? "on" : ""}`}
            onClick={() => setLang(l)}
            lang={l}
          >
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
      <button type="button" className="btn sheet-wide" onClick={go} disabled={busy}>
        {busy ? T.working : fmt(T.go, { lang: LOCALE_NAMES[lang] })}
      </button>
      {error && <p className="error">{error}</p>}
      <p className="meta sheet-foot">{T.note}</p>
    </Sheet>
  );
}

// ---------------- Questions jotted during the sermon ----------------
export function QuestionsSheet({
  questions,
  setQuestions,
  sermon,
  displayName,
  title,
  onClose,
}: {
  questions: DraftQuestion[];
  setQuestions: (q: DraftQuestion[]) => void;
  sermon: SharedSermon | null;
  displayName: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const Q = t.questions;
  const supabase = useRef(createClient()).current;
  const [draft, setDraft] = useState("");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const canSend = !!sermon?.questions_open;
  const unsent = questions.filter((q) => !q.sent_at);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setQuestions([...questions, { id: newId(), text: text.slice(0, 1000) }]);
    setDraft("");
  }

  async function sendAll() {
    if (!sermon) return;
    setBusy(true);
    setError("");
    setMsg("");
    if (showName && !displayName.trim()) {
      setBusy(false);
      return setError(Q.needName);
    }
    let next = [...questions];
    for (const q of unsent) {
      const { error: err } = await supabase.rpc("ask_question", { p_slug: sermon.slug, p_body: q.text, p_show_name: showName });
      if (err) {
        setError(err.message);
        break;
      }
      next = next.map((x) => (x.id === q.id ? { ...x, sent_at: new Date().toISOString() } : x));
      setQuestions(next);
    }
    setBusy(false);
    if (!next.some((q) => !q.sent_at)) setMsg(Q.sent);
    window.dispatchEvent(new Event("versenote:questions-sent"));
  }

  async function shareList() {
    const text = `${title ? `${title}\n` : ""}${unsent.map((q, i) => `${i + 1}. ${q.text}`).join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setMsg(Q.copied);
  }

  return (
    <Sheet title={Q.title} onClose={onClose}>
      <p className="meta" style={{ marginTop: 0 }}>{Q.intro}</p>
      <form onSubmit={add} className="q-add">
        <textarea
          className="input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={Q.placeholder}
          aria-label={Q.placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) add(e);
          }}
        />
        <button className="btn" disabled={!draft.trim()}>
          {Q.add}
        </button>
      </form>

      {questions.length > 0 && (
        <ol className="q-list">
          {questions.map((q, i) => (
            <li key={q.id} className={q.sent_at ? "sent" : ""}>
              <span className="q-num">{i + 1}.</span>
              <span className="q-text">{q.text}</span>
              {q.sent_at ? (
                <span className="badge">{Q.sentBadge}</span>
              ) : (
                <button
                  type="button"
                  className="btn ghost small"
                  aria-label={fmt(Q.remove, { q: q.text.slice(0, 40) })}
                  onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {unsent.length > 0 &&
        (canSend ? (
          <div className="q-send">
            <label className="check">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
              {showName && displayName ? fmt(Q.asName, { name: displayName }) : Q.showName}
            </label>
            <p className="meta" style={{ margin: "0.2rem 0 0.6rem" }}>{showName ? Q.namedNote : Q.anonNote}</p>
            <button type="button" className="btn sheet-wide" onClick={sendAll} disabled={busy}>
              {busy ? Q.sending : unsent.length === 1 ? Q.sendOne : fmt(Q.sendMany, { n: unsent.length })}
            </button>
          </div>
        ) : (
          <div className="q-send">
            <p className="meta" style={{ marginTop: 0 }}>{sermon ? Q.closed : Q.noSermon}</p>
            <button type="button" className="btn secondary sheet-wide" onClick={shareList}>
              {Q.shareList}
            </button>
          </div>
        ))}
      {error && <p className="error">{error}</p>}
      {msg && <p className="notice">{msg}</p>}
    </Sheet>
  );
}
