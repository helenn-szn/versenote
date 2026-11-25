"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import { createClient } from "@/lib/supabase/client";
import { findReferenceAtEnd, formatReference, parseReference } from "@/lib/bible/parse";
import { formatDate } from "@/lib/format";
import { sharedVerses, type Note, type SharedSermon, type Verse } from "@/lib/types";
import { contentToDoc, docText, type DocNode, type ScriptureAttrs } from "@/lib/notes/doc";
import { VerseText } from "./ScriptureCard";
import SermonCover from "./SermonCover";
import TranslationPicker from "./TranslationPicker";
import SermonRecorder, { type SermonNotes } from "./SermonRecorder";
import { ScriptureNode } from "./editor/ScriptureNode";
import type { TranslationId } from "@/lib/bible/translations";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";

type Passage = { reference: string; translation: string; verses: Verse[] };
type Suggestion =
  | { source: "typed"; refText: string; from: number; to: number; raw: string }
  | { source: "lookup"; refText: string };

/**
 * Put a scripture card at the cursor so it follows the message:
 * - typed at the end of a line: the card goes under that line and a new paragraph starts after it
 * - in the middle of a line: the line is split around the card
 * - on an empty line: the card takes its place, with a fresh paragraph below
 */
export function insertScripture(editor: Editor, attrs: ScriptureAttrs, replace?: { from: number; to: number; raw: string }) {
  editor
    .chain()
    .focus()
    .command(({ tr, state, dispatch }) => {
      if (!dispatch) return true;
      const leaf = "\ufffc";
      if (replace && replace.to <= tr.doc.content.size && tr.doc.textBetween(replace.from, replace.to, "\n", leaf) === replace.raw) {
        tr.delete(replace.from, replace.to);
        tr.setSelection(TextSelection.create(tr.doc, replace.from));
      }
      const scripture = state.schema.nodes.scripture.create(attrs);
      const para = state.schema.nodes.paragraph.create();
      const { $from } = tr.selection;
      const block = $from.parent;

      if (!block.isTextblock || $from.depth === 0) {
        const at = tr.selection.to;
        tr.insert(at, [scripture, para]);
        tr.setSelection(TextSelection.near(tr.doc.resolve(at + scripture.nodeSize + 1)));
        return true;
      }

      const before = block.textBetween(0, $from.parentOffset, "\n", leaf);
      const after = block.textBetween($from.parentOffset, block.content.size, "\n", leaf);
      const start = $from.before();
      const end = $from.after();

      if (!before.trim() && !after.trim()) {
        tr.replaceWith(start, end, [scripture, para]);
        tr.setSelection(TextSelection.create(tr.doc, start + scripture.nodeSize + 1));
      } else if (!after.trim()) {
        const trailing = before.length - before.trimEnd().length + after.length;
        if (trailing) tr.delete($from.pos - (before.length - before.trimEnd().length), $from.pos + after.length);
        const at = tr.mapping.map(end);
        tr.insert(at, [scripture, para]);
        tr.setSelection(TextSelection.create(tr.doc, at + scripture.nodeSize + 1));
      } else if (!before.trim()) {
        tr.insert(start, scripture);
      } else {
        const p = $from.pos;
        const lead = after.length - after.trimStart().length;
        const trail = before.length - before.trimEnd().length;
        tr.split(p);
        if (lead) tr.delete(p + 2, p + 2 + lead);
        if (trail) tr.delete(p - trail, p);
        const q = p - trail;
        tr.insert(q + 1, scripture);
        tr.setSelection(TextSelection.near(tr.doc.resolve(q + 1 + scripture.nodeSize + 1)));
        return true;
      }
      return true;
    })
    .scrollIntoView()
    .run();
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
  const { locale, t } = useI18n();
  const E = t.editor;
  const supabase = useRef(createClient()).current;
  const router = useRouter();

  const [title, setTitle] = useState(note.title ?? "");
  const [preacher, setPreacher] = useState(note.preacher_name ?? "");
  const [date, setDate] = useState(note.sermon_date ?? "");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState("");
  const [lookupInput, setLookupInput] = useState("");
  const [translation, setTranslation] = useState<TranslationId>(defaultTranslation);

  const [recSlot, setRecSlot] = useState<HTMLElement | null>(null);
  const dismissed = useRef(new Set<string>());
  const suggestionRef = useRef<Suggestion | null>(null);
  suggestionRef.current = suggestion;
  const passageRef = useRef<Passage | null>(null);
  passageRef.current = passage;

  // ---------- Autosave ----------
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, preacher, date });
  latest.current = { title, preacher, date };
  const editorRef = useRef<Editor | null>(null);

  const save = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;
    const { title, preacher, date } = latest.current;
    setSaveState("saving");
    const { blocks: _old, ...rest } = note.content;
    void _old;
    const { error } = await supabase
      .from("notes")
      .update({
        title,
        preacher_name: preacher || null,
        sermon_date: date || null,
        content: { ...rest, version: 2, doc: ed.getJSON() },
      })
      .eq("id", note.id);
    setSaveState(error ? "error" : "saved");
  }, [supabase, note.id, note.content]);

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
  }, [save]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scheduleSave();
  }, [title, preacher, date, scheduleSave]);

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

  // ---------- Editor ----------
  const detect = useCallback((ed: Editor) => {
    const { $from, empty } = ed.state.selection;
    if (!empty || !$from.parent.isTextblock) return;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "￼");
    const found = findReferenceAtEnd(textBefore);
    if (!found) return;
    const ref = formatReference(found.ref);
    const from = $from.start() + found.start;
    const to = $from.pos;
    const raw = ed.state.doc.textBetween(from, to, "\n", "￼");
    const key = `${$from.start()}:${ref}`;
    if (dismissed.current.has(key) || suggestionRef.current?.refText === ref) return;
    setSuggestion({ source: "typed", refText: ref, from, to, raw });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: E.placeholder }),
      ScriptureNode,
    ],
    content: contentToDoc(note.content),
    editorProps: {
      attributes: { class: "note-body", "aria-label": E.bodyAria, spellcheck: "true" },
      handleKeyDown: (_view, event) => {
        // Tab inserts the verse that's being suggested.
        if (event.key === "Tab" && suggestionRef.current && passageRef.current) {
          event.preventDefault();
          insertSuggestionRef.current();
          return true;
        }
        if (event.key === "Escape" && suggestionRef.current) {
          closeSuggestionRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed, transaction }) => {
      scheduleSave();
      if (transaction.docChanged) detect(ed);
    },
  });
  editorRef.current = editor;

  const fmtState = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            h2: ed.isActive("heading", { level: 2 }),
            h3: ed.isActive("heading", { level: 3 }),
            bold: ed.isActive("bold"),
            italic: ed.isActive("italic"),
            highlight: ed.isActive("highlight"),
            bullet: ed.isActive("bulletList"),
            quote: ed.isActive("blockquote"),
          }
        : null,
  });

  // ---------- Fetch the suggested passage ----------
  const refText = suggestion?.refText;
  useEffect(() => {
    if (!refText) return;
    const ctrl = new AbortController();
    setLookupState("loading");
    setPassage(null);
    const tm = setTimeout(async () => {
      try {
        const res = await fetch(`/api/verse?ref=${encodeURIComponent(refText)}&t=${translation}`, { signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) {
          setLookupError(body.error ?? E.loadFail);
          setLookupState("error");
        } else {
          setPassage(body as Passage);
          setLookupState("idle");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setLookupError(E.offline);
          setLookupState("error");
        }
      }
    }, 300);
    return () => {
      clearTimeout(tm);
      ctrl.abort();
    };
  }, [refText, translation, E.loadFail, E.offline]);

  function insertSuggestion() {
    const s = suggestionRef.current;
    const p = passageRef.current;
    if (!editor || !s || !p) return;
    insertScripture(editor, { reference: p.reference, translation: p.translation, verses: p.verses }, s.source === "typed" ? s : undefined);
    if (s.source === "lookup") setLookupInput("");
    closeSuggestion(false);
  }
  const insertSuggestionRef = useRef(insertSuggestion);
  insertSuggestionRef.current = insertSuggestion;

  function closeSuggestion(remember = true) {
    const s = suggestionRef.current;
    if (remember && s?.source === "typed" && editor) {
      const $pos = editor.state.doc.resolve(Math.min(s.from, editor.state.doc.content.size));
      dismissed.current.add(`${$pos.start()}:${s.refText}`);
    }
    setSuggestion(null);
    setPassage(null);
    setLookupState("idle");
  }
  const closeSuggestionRef = useRef(closeSuggestion);
  closeSuggestionRef.current = closeSuggestion;

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const ref = parseReference(lookupInput);
    if (!ref) {
      setSuggestion(null);
      setLookupError(E.badRef);
      setLookupState("error");
      return;
    }
    setSuggestion({ source: "lookup", refText: formatReference(ref) });
  }

  function insertShared(index: number) {
    const s = sermon!.scriptures[index];
    if (editor) insertScripture(editor, { reference: s.reference, translation: s.translation, verses: sharedVerses(s) });
  }

  /** Points the AI found in the recording that aren't in the notes. Marked so they're clearly not the member's own words. */
  const addMissedPoints = useCallback(
    async (points: { text: string; refs: string[] }[]) => {
      if (!editor || !points.length) return;
      const nodes: DocNode[] = [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: E.missedHeading }] }];
      for (const p of points) {
        nodes.push({ type: "paragraph", content: [{ type: "text", text: `✦ ${p.text}`, marks: [{ type: "highlight" }] }] });
        for (const r of p.refs.slice(0, 3)) {
          const ref = parseReference(r);
          if (!ref) continue;
          try {
            const res = await fetch(`/api/verse?ref=${encodeURIComponent(formatReference(ref))}&t=${translation}`);
            if (res.ok) {
              const v = (await res.json()) as Passage;
              nodes.push({ type: "scripture", attrs: { reference: v.reference, translation: v.translation, verses: v.verses } });
            }
          } catch {}
        }
      }
      nodes.push({ type: "paragraph" });
      editor.chain().focus("end").insertContent(nodes).run();
    },
    [editor, translation, E.missedHeading]
  );

  /** Nothing was written during the sermon: fill the note from the recording (clearly marked as AI). */
  const addSermonNotes = useCallback(
    async (notes: SermonNotes) => {
      if (!editor) return;
      if (!latest.current.title.trim() && notes.title) setTitle(notes.title);
      const nodes: DocNode[] = [
        { type: "paragraph", content: [{ type: "text", text: `✦ ${E.aiNotesLabel}`, marks: [{ type: "highlight" }] }] },
      ];
      for (const sec of notes.sections) {
        nodes.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: sec.heading }] });
        nodes.push({
          type: "bulletList",
          content: sec.points.map((p) => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: p.text }] }] })),
        });
        const refs = [...new Set(sec.points.flatMap((p) => p.refs))].slice(0, 4);
        for (const r of refs) {
          const ref = parseReference(r);
          if (!ref) continue;
          try {
            const res = await fetch(`/api/verse?ref=${encodeURIComponent(formatReference(ref))}&t=${translation}`);
            if (res.ok) {
              const v = (await res.json()) as Passage;
              nodes.push({ type: "scripture", attrs: { reference: v.reference, translation: v.translation, verses: v.verses } });
            }
          } catch {}
        }
      }
      nodes.push({ type: "paragraph" });
      editor.chain().setContent({ type: "doc", content: nodes }).focus("end").run();
      scheduleSave();
    },
    [editor, translation, E.aiNotesLabel, scheduleSave]
  );

  async function deleteNote() {
    if (!window.confirm(E.confirmDelete)) return;
    if (timer.current) clearTimeout(timer.current);
    await supabase.from("notes").delete().eq("id", note.id);
    router.push("/notes");
    router.refresh();
  }

  const used = new Set<string>();
  editor?.state.doc.descendants((n) => {
    if (n.type.name === "scripture") used.add(n.attrs.reference as string);
  });

  const tb = (label: string, active: boolean | undefined, run: () => void, content: React.ReactNode, cls = "") => (
    <button
      type="button"
      className={`tb-btn ${active ? "on" : ""} ${cls}`}
      aria-label={label}
      aria-pressed={!!active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {content}
    </button>
  );

  return (
    <div className="note-page">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <button type="button" className="btn ghost small" onClick={() => router.push("/notes")}>
          {E.back}
        </button>
        <span className={`save-state ${saveState}`} aria-live="polite">
          {saveState === "saving" ? E.saving : saveState === "error" ? E.notSaved : E.saved}
        </span>
      </div>

      {(sermon || title) && (
        <div className="note-cover">
          <SermonCover title={sermon?.title ?? title} />
        </div>
      )}

      <article className="paper">
        {sermon && <p className="eyebrow" style={{ marginBottom: "0.2rem" }}>{E.sharedByChurch}</p>}
        <input className="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={E.titlePh} aria-label={E.titlePh} />
        <div className="note-meta">
          <input className="input" value={preacher} onChange={(e) => setPreacher(e.target.value)} placeholder={E.preacherPh} aria-label={E.preacherPh} />
          <input className="input" type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} aria-label={E.date} />
        </div>

        {sermon && (sermon.scriptures.length > 0 || sermon.outline || sermon.recording_url) && (
          <div className="card tint">
            {sermon.scriptures.length > 0 && (
              <>
                <div className="meta" style={{ marginBottom: "0.4rem" }}>{E.todays}</div>
                <div className="tray">
                  {sermon.scriptures.map((s, i) => (
                    <button
                      key={s.position}
                      type="button"
                      className={`chip ${used.has(s.reference) ? "used" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
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
                <summary>{E.outline}</summary>
                <div className="outline" style={{ marginTop: "0.4rem" }}>{sermon.outline}</div>
              </details>
            )}
            {sermon.recording_url && (
              <p style={{ margin: "0.6rem 0 0" }}>
                <a href={sermon.recording_url} target="_blank" rel="noopener noreferrer">{E.recording}</a>
              </p>
            )}
          </div>
        )}

        <div className="toolbar" role="toolbar" aria-label={E.toolbar}>
          {tb(E.tbHeading, fmtState?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), "H1", "txt")}
          {tb(E.tbSubheading, fmtState?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), "H2", "txt")}
          <span className="tb-sep" aria-hidden />
          {tb(E.tbBold, fmtState?.bold, () => editor?.chain().focus().toggleBold().run(), <b>B</b>, "txt")}
          {tb(E.tbItalic, fmtState?.italic, () => editor?.chain().focus().toggleItalic().run(), <i style={{ fontFamily: "Georgia, serif" }}>I</i>, "txt")}
          {tb(E.tbHighlight, fmtState?.highlight, () => editor?.chain().focus().toggleHighlight().run(), <span className="tb-hl">A</span>, "txt")}
          <span className="tb-sep" aria-hidden />
          {tb(E.tbBullets, fmtState?.bullet, () => editor?.chain().focus().toggleBulletList().run(), <ListIcon />)}
          {tb(E.tbQuote, fmtState?.quote, () => editor?.chain().focus().toggleBlockquote().run(), <QuoteIcon />)}
          <span className="tb-grow" />
          <div ref={setRecSlot} className="tb-rec" />
        </div>

        <div className="note-editor">
          <EditorContent editor={editor} />

          {(suggestion || lookupState === "error") && (
            <div className="suggest" role="dialog" aria-label={E.suggestAria}>
              {lookupState === "loading" && <div className="meta">{fmt(E.lookingUp, { ref: suggestion?.refText ?? "" })}</div>}
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
                  <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={insertSuggestion}>
                    {E.insert} <kbd>Tab</kbd>
                  </button>
                )}
                <button type="button" className="btn ghost small" onMouseDown={(e) => e.preventDefault()} onClick={() => closeSuggestion()}>
                  {E.dismiss}
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={lookup} className="row lookup-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder={E.lookupPh}
            aria-label={E.lookupAria}
          />
          <TranslationPicker value={translation} onChange={setTranslation} compact />
          <button className="btn secondary" onMouseDown={(e) => e.preventDefault()}>{E.lookup}</button>
        </form>
      </article>

      <SermonRecorder
        noteId={note.id}
        notesText={() => (editor ? docText(editor.getJSON() as never) : "")}
        onAddPoints={addMissedPoints}
        onAutoNotes={addSermonNotes}
        slot={recSlot}
      />

      <hr className="divider" />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="meta">{note.sermon_date ? fmt(E.sermonOn, { date: formatDate(note.sermon_date, locale) }) : ""}</span>
        <button type="button" className="btn danger small" onClick={deleteNote}>
          {E.deleteNote}
        </button>
      </div>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.2 17c-1.9 0-3.2-1.5-3.2-3.6C4 9.9 6.4 7.3 9.4 6.5l.6 1.3c-1.7.7-2.8 2-3 3.4.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9S9.4 17 7.2 17Zm8.8 0c-1.9 0-3.2-1.5-3.2-3.6 0-3.5 2.4-6.1 5.4-6.9l.6 1.3c-1.7.7-2.8 2-3 3.4.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9S18.2 17 16 17Z" />
    </svg>
  );
}
