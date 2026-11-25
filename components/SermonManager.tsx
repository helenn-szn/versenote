"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { parseReference, formatReference } from "@/lib/bible/parse";
import { sharedVerses, type Verse } from "@/lib/types";
import ScriptureCard, { VerseText } from "./ScriptureCard";
import SermonCover from "./SermonCover";
import TranslationPicker from "./TranslationPicker";
import type { TranslationId } from "@/lib/bible/translations";
import { useI18n } from "@/lib/i18n/client";
import OutlineEditor from "./OutlineEditor";
import { parseOutline, serializeOutline } from "@/lib/outline";
import { fmt } from "@/lib/i18n/config";


type Scripture = { id: string; position: number; reference: string; translation: string; verse_text: string };
export type ManagedSermon = {
  id: string;
  slug: string;
  title: string;
  preacher_name: string | null;
  sermon_date: string | null;
  outline: string | null;
  share_mode: "full" | "scriptures_only";
  is_active: boolean;
  questions_open: boolean;
  recording_url: string | null;
  sermon_scriptures: Scripture[];
  sermon_join_counts: { joins: number } | { joins: number }[] | null;
};

type Answer = { body: string; is_public: boolean; answered_at: string };
type Question = {
  id: string;
  body: string;
  shown_name: string | null;
  status: "open" | "answered" | "hidden";
  created_at: string;
  question_answers: Answer | Answer[] | null;
};
const firstAnswer = (a: Question["question_answers"]) => (Array.isArray(a) ? a[0] : a) ?? null;

export default function SermonManager({
  initial,
  defaultTranslation,
}: {
  initial: ManagedSermon;
  defaultTranslation: TranslationId;
}) {
  const { t } = useI18n();
  const M = t.manager;
  const supabase = useRef(createClient()).current;
  const router = useRouter();

  // ---------- Details ----------
  const [form, setForm] = useState({
    title: initial.title,
    preacher_name: initial.preacher_name ?? "",
    sermon_date: initial.sermon_date ?? "",
    outline: initial.outline ?? "",
    share_mode: initial.share_mode,
    recording_url: initial.recording_url ?? "",
    slug: initial.slug,
  });
  const [points, setPoints] = useState<string[]>(parseOutline(initial.outline));
  const [slug, setSlug] = useState(initial.slug);
  const [isActive, setIsActive] = useState(initial.is_active);
  const [questionsOpen, setQuestionsOpen] = useState(initial.questions_open);
  const [detailsMsg, setDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setDetailsMsg(null);
  };

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const newSlug = form.slug.trim().toLowerCase();
    if (!form.title.trim()) return setDetailsMsg({ ok: false, text: M.errTitle });
    if (!/^[a-z0-9-]{6,60}$/.test(newSlug))
      return setDetailsMsg({ ok: false, text: M.errSlug });
    if (form.recording_url && !form.recording_url.startsWith("https://"))
      return setDetailsMsg({ ok: false, text: M.errHttps });
    setSavingDetails(true);
    const { error } = await supabase
      .from("sermons")
      .update({
        title: form.title.trim(),
        preacher_name: form.preacher_name.trim() || null,
        sermon_date: form.sermon_date || null,
        outline: serializeOutline(points) || null,
        share_mode: form.share_mode,
        recording_url: form.recording_url.trim() || null,
        slug: newSlug,
      })
      .eq("id", initial.id);
    setSavingDetails(false);
    if (error) {
      setDetailsMsg({
        ok: false,
        text: error.code === "23505" ? M.errSlugTaken : M.errSave,
      });
    } else {
      setSlug(newSlug);
      setDetailsMsg({ ok: true, text: M.savedDetails });
    }
  }

  async function toggle(field: "is_active" | "questions_open", value: boolean) {
    const { error } = await supabase.from("sermons").update({ [field]: value }).eq("id", initial.id);
    if (!error) (field === "is_active" ? setIsActive : setQuestionsOpen)(value);
  }

  // ---------- Share link + QR ----------
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = origin ? `${origin}/s/${slug}` : "";
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 800, margin: 2, color: { dark: "#1f2a2a", light: "#ffffff" } }).then(setQr);
  }, [link]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---------- Scriptures ----------
  const [scriptures, setScriptures] = useState<Scripture[]>(
    [...initial.sermon_scriptures].sort((a, b) => a.position - b.position)
  );
  const [refInput, setRefInput] = useState("");
  const [preview, setPreview] = useState<{ reference: string; translation: string; verses: Verse[] } | null>(null);
  const [refMsg, setRefMsg] = useState("");
  const [refBusy, setRefBusy] = useState(false);
  const [translation, setTranslation] = useState<TranslationId>(defaultTranslation);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setPreview(null);
    const ref = parseReference(refInput);
    if (!ref) return setRefMsg(M.badRef);
    setRefBusy(true);
    setRefMsg("");
    const res = await fetch(`/api/verse?ref=${encodeURIComponent(formatReference(ref))}&t=${translation}`);
    const body = await res.json();
    setRefBusy(false);
    if (!res.ok) return setRefMsg(body.error ?? M.loadFail);
    setPreview(body);
  }

  async function addScripture() {
    if (!preview) return;
    const position = scriptures.length ? Math.max(...scriptures.map((s) => s.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("sermon_scriptures")
      .insert({
        sermon_id: initial.id,
        position,
        reference: preview.reference,
        translation: preview.translation,
        verse_text: JSON.stringify(preview.verses),
      })
      .select("id, position, reference, translation, verse_text")
      .single();
    if (error || !data) return setRefMsg(M.addFail);
    setScriptures((s) => [...s, data as Scripture]);
    setPreview(null);
    setRefInput("");
  }

  async function removeScripture(id: string) {
    const { error } = await supabase.from("sermon_scriptures").delete().eq("id", id);
    if (!error) setScriptures((s) => s.filter((x) => x.id !== id));
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= scriptures.length) return;
    const a = scriptures[index];
    const b = scriptures[j];
    // Swap positions via a temporary slot to respect the unique (sermon_id, position) rule.
    const temp = Math.max(...scriptures.map((s) => s.position)) + 1;
    await supabase.from("sermon_scriptures").update({ position: temp }).eq("id", a.id);
    await supabase.from("sermon_scriptures").update({ position: a.position }).eq("id", b.id);
    await supabase.from("sermon_scriptures").update({ position: b.position }).eq("id", a.id);
    const next = [...scriptures];
    next[index] = { ...b, position: a.position };
    next[j] = { ...a, position: b.position };
    setScriptures(next);
  }

  // ---------- Questions ----------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { body: string; is_public: boolean }>>({});
  const [qMsg, setQMsg] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    const { data } = await supabase
      .from("sermon_questions")
      .select("id, body, shown_name, status, created_at, question_answers(body, is_public, answered_at)")
      .eq("sermon_id", initial.id)
      .order("created_at", { ascending: true });
    const qs = (data as Question[] | null) ?? [];
    setQuestions(qs);
    setDrafts((d) => {
      const next = { ...d };
      for (const q of qs) {
        const a = firstAnswer(q.question_answers);
        if (!next[q.id]) next[q.id] = { body: a?.body ?? "", is_public: a?.is_public ?? false };
      }
      return next;
    });
  }, [supabase, initial.id]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  async function saveAnswer(q: Question) {
    const d = drafts[q.id];
    if (!d?.body.trim()) return setQMsg((m) => ({ ...m, [q.id]: M.writeAnswer }));
    const { error } = await supabase
      .from("question_answers")
      .upsert({ question_id: q.id, body: d.body.trim(), is_public: d.is_public }, { onConflict: "question_id" });
    setQMsg((m) => ({ ...m, [q.id]: error ? M.answerFail : M.answerSent }));
    if (!error) void loadQuestions();
  }

  async function setStatus(q: Question, status: Question["status"]) {
    const { error } = await supabase.from("sermon_questions").update({ status }).eq("id", q.id);
    if (!error) void loadQuestions();
  }

  async function deleteQuestion(q: Question) {
    if (!window.confirm(M.confirmQuestion)) return;
    const { error } = await supabase.from("sermon_questions").delete().eq("id", q.id);
    if (!error) setQuestions((qs) => qs.filter((x) => x.id !== q.id));
  }

  async function deleteSermon() {
    if (!window.confirm(M.confirmSermon)) return;
    const { error } = await supabase.from("sermons").delete().eq("id", initial.id);
    if (!error) {
      router.push("/pastor");
      router.refresh();
    }
  }

  const jc = Array.isArray(initial.sermon_join_counts) ? initial.sermon_join_counts[0] : initial.sermon_join_counts;
  const open = questions.filter((q) => q.status === "open").length;

  return (
    <div>
      <button type="button" className="btn ghost small" onClick={() => router.push("/pastor")}>
        {M.back}
      </button>
      <div style={{ margin: "0.6rem 0 1rem" }}>
        <SermonCover title={form.title} />
      </div>
      <p className="eyebrow brown" style={{ marginBottom: "0.2rem" }}>{M.eyebrow}</p>
      <h1>{form.title || M.untitled}</h1>
      <p className="notice" style={{ marginTop: "-0.25rem" }}>{M.artNote}</p>

      {/* Share */}
      <section className="card">
        <h2>{M.shareTitle}</h2>
        <div className="qr-box">
          {qr ? <img src={qr} alt={fmt(M.qrAlt, { link })} /> : <div style={{ width: 180, height: 180 }} />}
          <div className="stack" style={{ flex: 1, minWidth: 200 }}>
            <div className="meta" style={{ wordBreak: "break-all" }}>{link}</div>
            <div className="row">
              <button type="button" className="btn small" onClick={copy} disabled={!link}>
                {copied ? M.copied : M.copy}
              </button>
              {qr && (
                <a className="btn secondary small" href={qr} download={`${slug}-qr.png`}>
                  {M.downloadQr}
                </a>
              )}
            </div>
            <div className="meta">{fmt(M.opened, { n: jc?.joins ?? 0 })}</div>
            <label className="check">
              <input type="checkbox" checked={isActive} onChange={(e) => toggle("is_active", e.target.checked)} />
              {M.linkIsOn}
            </label>
            <label className="check">
              <input type="checkbox" checked={questionsOpen} onChange={(e) => toggle("questions_open", e.target.checked)} />
              {M.accept}
            </label>
          </div>
        </div>
      </section>

      {/* Scriptures */}
      <section className="card">
        <h2>{M.scriptures}</h2>
        <p className="meta">{M.scripturesNote}</p>
        {scriptures.map((s, i) => (
          <div key={s.id}>
            <ScriptureCard reference={s.reference} translation={s.translation} verses={sharedVerses(s)} onRemove={() => removeScripture(s.id)} />
            <div className="row" style={{ marginBottom: "0.4rem" }}>
              <button type="button" className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={M.up}>
                ↑
              </button>
              <button type="button" className="btn ghost small" onClick={() => move(i, 1)} disabled={i === scriptures.length - 1} aria-label={M.down}>
                ↓
              </button>
            </div>
          </div>
        ))}
        <form onSubmit={lookup} className="row" style={{ marginTop: "0.5rem" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            value={refInput}
            onChange={(e) => {
              setRefInput(e.target.value);
              setRefMsg("");
            }}
            placeholder={M.addPh}
            aria-label={M.addAria}
          />
          <TranslationPicker
            value={translation}
            onChange={(t) => {
              setTranslation(t);
              setPreview(null);
            }}
            compact
          />
          <button className="btn secondary" disabled={refBusy}>
            {refBusy ? M.looking : M.lookup}
          </button>
        </form>
        {refMsg && <p className="error">{refMsg}</p>}
        {preview && (
          <div className="suggest" style={{ position: "static", boxShadow: "none" }}>
            <strong>{preview.reference}</strong> <span className="meta">{preview.translation}</span>
            <VerseText verses={preview.verses} />
            <div className="row">
              <button type="button" className="btn small" onClick={addScripture}>
                {M.add}
              </button>
              <button type="button" className="btn ghost small" onClick={() => setPreview(null)}>
                {M.cancel}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Details */}
      <form className="card" onSubmit={saveDetails}>
        <h2>{M.details}</h2>
        <div className="field">
          <label htmlFor="t">{M.title}</label>
          <input id="t" className="input" value={form.title} onChange={set("title")} maxLength={200} />
        </div>
        <div className="note-meta">
          <div>
            <label htmlFor="p">{M.preacher}</label>
            <input id="p" className="input" value={form.preacher_name} onChange={set("preacher_name")} maxLength={100} />
          </div>
          <div>
            <label htmlFor="d">{M.date}</label>
            <input id="d" className="input" type="date" value={form.sermon_date} onChange={set("sermon_date")} />
          </div>
        </div>
        <div className="field">
          <span className="label">{M.outline}</span>
          <p className="meta" style={{ margin: "0 0 0.5rem" }}>{M.outlineHelp}</p>
          <OutlineEditor
            points={points}
            onChange={(p) => {
              setPoints(p);
              setDetailsMsg(null);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="m">{M.see}</label>
          <select id="m" className="input" value={form.share_mode} onChange={set("share_mode")}>
            <option value="full">{M.seeFull}</option>
            <option value="scriptures_only">{M.seeScriptures}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="r">{M.recording}</label>
          <input id="r" className="input" value={form.recording_url} onChange={set("recording_url")} placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="s">{M.slug}</label>
          <input id="s" className="input" value={form.slug} onChange={set("slug")} maxLength={60} />
          <div className="notice">{M.slugNote}</div>
        </div>
        <button className="btn" disabled={savingDetails}>
          {savingDetails ? M.saving : M.save}
        </button>
        {detailsMsg && <p className={detailsMsg.ok ? "notice" : "error"} style={{ marginTop: "0.5rem" }}>{detailsMsg.text}</p>}
      </form>

      {/* Questions */}
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{M.questions} {open > 0 && <span className="badge">{fmt(M.newCount, { n: open })}</span>}</h2>
          <button type="button" className="btn ghost small" onClick={loadQuestions}>
            {M.refresh}
          </button>
        </div>
        <p className="meta">{M.anonNote}</p>
        {questions.length === 0 && <p className="notice">{M.none}</p>}
        {questions.map((q) => {
          const d = drafts[q.id] ?? { body: "", is_public: false };
          const answered = !!firstAnswer(q.question_answers);
          return (
            <div className="qa" key={q.id} style={{ opacity: q.status === "hidden" ? 0.6 : 1 }}>
              <div className="q">{q.body}</div>
              <div className="meta">
                {q.shown_name ?? M.anonymous} · {new Date(q.created_at).toLocaleString()}
                {q.status === "hidden" && ` · ${M.hidden}`}
              </div>
              <textarea
                className="textarea"
                style={{ marginTop: "0.5rem", minHeight: 70 }}
                value={d.body}
                maxLength={5000}
                onChange={(e) => {
                  setDrafts((x) => ({ ...x, [q.id]: { ...d, body: e.target.value } }));
                  setQMsg((m) => ({ ...m, [q.id]: "" }));
                }}
                placeholder={M.answerPh}
                aria-label={M.answerAria}
              />
              <label className="check" style={{ margin: "0.4rem 0" }}>
                <input
                  type="checkbox"
                  checked={d.is_public}
                  onChange={(e) => setDrafts((x) => ({ ...x, [q.id]: { ...d, is_public: e.target.checked } }))}
                />
                {M.publish}
              </label>
              <div className="row">
                <button type="button" className="btn small" onClick={() => saveAnswer(q)}>
                  {answered ? M.update : M.sendAnswer}
                </button>
                {q.status === "hidden" ? (
                  <button type="button" className="btn ghost small" onClick={() => setStatus(q, answered ? "answered" : "open")}>
                    {M.unhide}
                  </button>
                ) : (
                  <button type="button" className="btn ghost small" onClick={() => setStatus(q, "hidden")}>
                    {M.hide}
                  </button>
                )}
                <button type="button" className="btn ghost small" onClick={() => deleteQuestion(q)}>
                  {M.delete}
                </button>
              </div>
              {qMsg[q.id] && <p className="notice" style={{ margin: "0.3rem 0 0" }}>{qMsg[q.id]}</p>}
            </div>
          );
        })}
      </section>

      <button type="button" className="btn danger small" onClick={deleteSermon}>
        {M.deleteSermon}
      </button>
    </div>
  );
}
