"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { findReferenceAtEnd, formatReference, parseReference } from "@/lib/bible/parse";
import { formatDate } from "@/lib/format";
import {
  newId,
  sharedVerses,
  type Block,
  type Note,
  type ScriptureBlock,
  type SharedSermon,
  type TextBlock,
  type Verse,
} from "@/lib/types";
import ScriptureCard, { VerseText } from "./ScriptureCard";
import SermonCover from "./SermonCover";
import TranslationPicker from "./TranslationPicker";
import type { TranslationId } from "@/lib/bible/translations";

type Passage = { reference: string; translation: string; verses: Verse[] };
type Suggestion =
  | { source: "typed"; blockId: string; raw: string; refText: string }
  | { source: "lookup"; refText: string };
type Caret = { blockId: string; pos: number };

// Merge neighbouring text blocks (after a scripture card is removed).
function normalise(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.type === "text" && prev?.type === "text") {
      out[out.length - 1] = { ...prev, text: [prev.text, b.text].filter((t) => t.length).join("\n") };
    } else out.push(b);
  }
  if (out[out.length - 1]?.type !== "text") out.push({ id: newId(), type: "text", text: "" });
  if (out[0]?.type !== "text") out.unshift({ id: newId(), type: "text", text: "" });
  return out;
}

function AutoTextarea(props: {
  block: TextBlock;
  placeholder?: string;
  onChange: (value: string, caret: number) => void;
  onCaret: (caret: number) => void;
  register: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.block.text]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        props.register(el);
      }}
      className="block-text"
      rows={1}
      value={props.block.text}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
      onSelect={(e) => props.onCaret(e.currentTarget.selectionStart ?? 0)}
      onFocus={(e) => props.onCaret(e.currentTarget.selectionStart ?? 0)}
    />
  );
}

export default function NoteEditor({
  note,
  sermon,
  defaultTranslation,
}: {
  note: Note;
  sermon: SharedSermon | null;
  defaultTranslation: TranslationId;
}) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();

  const [title, setTitle] = useState(note.title ?? "");
  const [preacher, setPreacher] = useState(note.preacher_name ?? "");
  const [date, setDate] = useState(note.sermon_date ?? "");
  const [blocks, setBlocks] = useState<Block[]>(() => normalise(note.content.blocks ?? []));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState("");
  const [lookupInput, setLookupInput] = useState("");
  const [translation, setTranslation] = useState<TranslationId>(defaultTranslation);

  const caret = useRef<Caret | null>(null);
  const dismissed = useRef(new Set<string>());
  const textareas = useRef(new Map<string, HTMLTextAreaElement>());
  const focusNext = useRef<{ id: string; pos: number } | null>(null);

  // ---------- Autosave ----------
  const latest = useRef({ title, preacher, date, blocks });
  latest.current = { title, preacher, date, blocks };
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    const { title, preacher, date, blocks } = latest.current;
    setSaveState("saving");
    const { error } = await supabase
      .from("notes")
      .update({
        title,
        preacher_name: preacher || null,
        sermon_date: date || null,
        content: { ...note.content, version: 1, blocks },
      })
      .eq("id", note.id);
    setSaveState(error ? "error" : "saved");
  }, [supabase, note.id, note.content]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
  }, [title, preacher, date, blocks, save]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void save();
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [save]);

  // ---------- Focus management after inserting a card ----------
  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    const el = textareas.current.get(f.id);
    if (el) {
      el.focus();
      el.setSelectionRange(f.pos, f.pos);
      caret.current = { blockId: f.id, pos: f.pos };
    }
    focusNext.current = null;
  }, [blocks]);

  // ---------- Fetch the suggested passage ----------
  const refText = suggestion?.refText;
  useEffect(() => {
    if (!refText) return;
    const ctrl = new AbortController();
    setLookupState("loading");
    setPassage(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/verse?ref=${encodeURIComponent(refText)}&t=${translation}`, { signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) {
          setLookupError(body.error ?? "Couldn't load that passage.");
          setLookupState("error");
        } else {
          setPassage(body as Passage);
          setLookupState("idle");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setLookupError("Couldn't reach the Bible service. Check your connection.");
          setLookupState("error");
        }
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [refText, translation]);

  // ---------- Editing ----------
  function onTextChange(blockId: string, value: string, pos: number) {
    setBlocks((bs) => bs.map((b) => (b.id === blockId && b.type === "text" ? { ...b, text: value } : b)));
    caret.current = { blockId, pos };
    const found = findReferenceAtEnd(value.slice(0, pos));
    if (found) {
      const ref = formatReference(found.ref);
      const raw = value.slice(found.start, pos).trim();
      if (!dismissed.current.has(`${blockId}:${ref}`) && ref !== suggestion?.refText) {
        setSuggestion({ source: "typed", blockId, raw, refText: ref });
      }
    }
  }

  function makeCard(p: { reference: string; translation: string; verses: Verse[] }): ScriptureBlock {
    return { id: newId(), type: "scripture", reference: p.reference, translation: p.translation, verses: p.verses };
  }

  // Split a text block at [from, to) and put the card in between.
  function insertCard(card: ScriptureBlock, at: { blockId: string; from: number; to: number } | null) {
    setBlocks((bs) => {
      const idx = at ? bs.findIndex((b) => b.id === at.blockId) : -1;
      if (!at || idx === -1 || bs[idx].type !== "text") {
        const after: TextBlock = { id: newId(), type: "text", text: "" };
        focusNext.current = { id: after.id, pos: 0 };
        // Replace a trailing empty text block rather than stacking empties.
        const last = bs[bs.length - 1];
        const base = last?.type === "text" && last.text === "" ? bs.slice(0, -1) : bs;
        return normalise([...base, card, after]);
      }
      const block = bs[idx] as TextBlock;
      const before = block.text.slice(0, at.from).replace(/\s+$/, "");
      const afterText = block.text.slice(at.to).replace(/^\s+/, "");
      const beforeBlock: TextBlock = { ...block, text: before };
      const afterBlock: TextBlock = { id: newId(), type: "text", text: afterText };
      focusNext.current = { id: afterBlock.id, pos: 0 };
      const replacement: Block[] = before ? [beforeBlock, card, afterBlock] : [card, afterBlock];
      return normalise([...bs.slice(0, idx), ...replacement, ...bs.slice(idx + 1)]);
    });
  }

  function insertSuggestion() {
    if (!passage || !suggestion) return;
    const card = makeCard(passage);
    if (suggestion.source === "typed") {
      const block = blocks.find((b) => b.id === suggestion.blockId);
      const pos = block?.type === "text" ? block.text.lastIndexOf(suggestion.raw) : -1;
      if (pos >= 0) insertCard(card, { blockId: suggestion.blockId, from: pos, to: pos + suggestion.raw.length });
      else insertCard(card, caret.current && { blockId: caret.current.blockId, from: caret.current.pos, to: caret.current.pos });
    } else {
      insertCard(card, caret.current && { blockId: caret.current.blockId, from: caret.current.pos, to: caret.current.pos });
      setLookupInput("");
    }
    closeSuggestion(false);
  }

  function closeSuggestion(remember = true) {
    if (remember && suggestion?.source === "typed") dismissed.current.add(`${suggestion.blockId}:${suggestion.refText}`);
    setSuggestion(null);
    setPassage(null);
    setLookupState("idle");
  }

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const ref = parseReference(lookupInput);
    if (!ref) {
      setSuggestion(null);
      setLookupError("Try a reference like John 3:16, Gen 1:1-3 or Psalm 23.");
      setLookupState("error");
      return;
    }
    setSuggestion({ source: "lookup", refText: formatReference(ref) });
  }

  function insertShared(index: number) {
    const s = sermon!.scriptures[index];
    const card = makeCard({ reference: s.reference, translation: s.translation, verses: sharedVerses(s) });
    insertCard(card, caret.current && { blockId: caret.current.blockId, from: caret.current.pos, to: caret.current.pos });
  }

  function removeCard(id: string) {
    setBlocks((bs) => normalise(bs.filter((b) => b.id !== id)));
  }

  async function deleteNote() {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    if (timer.current) clearTimeout(timer.current);
    await supabase.from("notes").delete().eq("id", note.id);
    router.push("/notes");
    router.refresh();
  }

  const used = new Set(blocks.filter((b) => b.type === "scripture").map((b) => (b as ScriptureBlock).reference));
  const firstTextId = blocks.find((b) => b.type === "text")?.id;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <button type="button" className="btn ghost small" onClick={() => router.push("/notes")}>
          ← My notes
        </button>
        <span className="save-state" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved, check your connection" : "Saved"}
        </span>
      </div>

      {(sermon || title) && (
        <div className="note-cover">
          <SermonCover title={sermon?.title ?? title} />
        </div>
      )}
      {sermon && <p className="eyebrow" style={{ marginBottom: "0.2rem" }}>Shared by your church</p>}
      <input
        className="note-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Sermon title"
        aria-label="Sermon title"
      />
      <div className="note-meta">
        <input className="input" value={preacher} onChange={(e) => setPreacher(e.target.value)} placeholder="Preacher" aria-label="Preacher" />
        <input className="input" type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>

      {sermon && (sermon.scriptures.length > 0 || sermon.outline || sermon.recording_url) && (
        <div className="card tint">
          {sermon.scriptures.length > 0 && (
            <>
              <div className="meta" style={{ marginBottom: "0.4rem" }}>
                Today&rsquo;s scriptures. Tap one to add it where you&rsquo;re typing.
              </div>
              <div className="tray">
                {sermon.scriptures.map((s, i) => (
                  <button
                    key={s.position}
                    type="button"
                    className={`chip ${used.has(s.reference) ? "used" : ""}`}
                    onClick={() => insertShared(i)}
                  >
                    {used.has(s.reference) ? "✓ " : "+ "}
                    {s.reference}
                  </button>
                ))}
              </div>
            </>
          )}
          {sermon.outline && (
            <details style={{ marginTop: sermon.scriptures.length ? "0.75rem" : 0 }}>
              <summary>Pastor&rsquo;s outline</summary>
              <div className="outline" style={{ marginTop: "0.4rem" }}>
                {sermon.outline}
              </div>
            </details>
          )}
          {sermon.recording_url && (
            <p style={{ margin: "0.6rem 0 0" }}>
              <a href={sermon.recording_url} target="_blank" rel="noopener noreferrer">
                Watch or listen to the recording
              </a>
            </p>
          )}
        </div>
      )}

      <div>
        {blocks.map((b) =>
          b.type === "text" ? (
            <AutoTextarea
              key={b.id}
              block={b}
              placeholder={b.id === firstTextId && blocks.length === 1 ? "Start taking notes. Type a reference like Gen 1:1 to add the verse." : ""}
              onChange={(v, pos) => onTextChange(b.id, v, pos)}
              onCaret={(pos) => (caret.current = { blockId: b.id, pos })}
              register={(el) => {
                if (el) textareas.current.set(b.id, el);
                else textareas.current.delete(b.id);
              }}
            />
          ) : (
            <ScriptureCard key={b.id} reference={b.reference} translation={b.translation} verses={b.verses} onRemove={() => removeCard(b.id)} />
          )
        )}
      </div>

      {(suggestion || lookupState === "error") && (
        <div className="suggest" role="dialog" aria-label="Scripture suggestion">
          {lookupState === "loading" && <div className="meta">Looking up {suggestion?.refText}…</div>}
          {lookupState === "error" && <div className="error">{lookupError}</div>}
          {passage && (
            <>
              <div className="ref" style={{ fontWeight: 700 }}>
                {passage.reference} <span className="meta">{passage.translation}</span>
              </div>
              <VerseText verses={passage.verses} />
            </>
          )}
          <div className="row">
            {passage && (
              <button type="button" className="btn small" onClick={insertSuggestion}>
                Insert
              </button>
            )}
            <button type="button" className="btn ghost small" onClick={() => closeSuggestion()}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={lookup} className="row" style={{ marginTop: "1rem" }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          value={lookupInput}
          onChange={(e) => setLookupInput(e.target.value)}
          placeholder="Look up a verse, e.g. Romans 8:28"
          aria-label="Look up a verse"
        />
        <TranslationPicker value={translation} onChange={setTranslation} compact />
        <button className="btn secondary">Look up</button>
      </form>

      <hr className="divider" />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="meta">
          {note.sermon_date ? `Sermon on ${formatDate(note.sermon_date)}` : ""}
        </span>
        <button type="button" className="btn danger small" onClick={deleteNote}>
          Delete note
        </button>
      </div>
    </div>
  );
}
