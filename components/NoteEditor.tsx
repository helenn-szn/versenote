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
import { sharedVerses, type DraftQuestion, type Note, type SharedSermon, type Verse } from "@/lib/types";
import { contentToDoc, docText, type DocNode, type ScriptureAttrs } from "@/lib/notes/doc";
import { VerseText } from "./ScriptureCard";
import SermonCover from "./SermonCover";
import TranslationPicker from "./TranslationPicker";
import SermonRecorder, { type SermonNotes } from "./SermonRecorder";
import { QuestionsSheet, ShareSheet, TranslateSheet } from "./NoteSheets";
import { ScriptureNode } from "./editor/ScriptureNode";
import type { TranslationId } from "@/lib/bible/translations";
import { useI18n } from "@/lib/i18n/client";
import { parseOutline } from "@/lib/outline";
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
  displayName = "",
}: {
  note: Note;
  sermon: SharedSermon | null;
  defaultTranslation: TranslationId;
  displayName?: string;
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
  const [sheet, setSheet] = useState<null | "share" | "translate" | "questions">(null);
  const [questions, setQuestionsState] = useState<DraftQuestion[]>(note.content.questions ?? []);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const [kb, setKb] = useState(0); // on-screen keyboard height, so the dock sits above it

  // Long titles wrap instead of running off the page.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
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
        content: { ...rest, version: 2, doc: ed.getJSON(), questions: questionsRef.current },
      })
      .eq("id", note.id);
    setSaveState(error ? "error" : "saved");
  }, [supabase, note.id, note.content]);

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
  }, [save]);

  const setQuestions = useCallback(
    (q: DraftQuestion[]) => {
      questionsRef.current = q;
      setQuestionsState(q);
      scheduleSave();
    },
    [scheduleSave]
  );

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

  // ---------- Following the pastor's outline ----------
  const outlinePoints = parseOutline(sermon?.outline);
  const headingsInNote = (): string[] => {
    const out: string[] = [];
    editor?.state.doc.forEach((n) => {
      if (n.type.name === "heading" && n.textContent.trim()) out.push(n.textContent.trim());
    });
    return out;
  };
  const usedPoints = new Set(headingsInNote().map((h) => h.toLowerCase()));

  /** Tap a point: it becomes a subheading in the note, with the cursor ready underneath. Tapping again jumps to it. */
  function selectPoint(point: string) {
    if (!editor) return;
    let found = -1;
    editor.state.doc.forEach((n, pos) => {
      if (found < 0 && n.type.name === "heading" && n.textContent.trim().toLowerCase() === point.toLowerCase()) found = pos + n.nodeSize;
    });
    if (found >= 0) {
      const after = editor.state.doc.nodeAt(found);
      if (!after || after.type.name !== "paragraph") editor.chain().insertContentAt(found, { type: "paragraph" }).run();
      editor.chain().focus().setTextSelection(found + 1).scrollIntoView().run();
      return;
    }
    const doc = editor.state.doc;
    const block = [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: point }] },
      { type: "paragraph" },
    ];
    // Keep the pastor's order: if a later point is already in the note, put this one just before it.
    const later = new Set(outlinePoints.slice(outlinePoints.findIndex((p) => p.toLowerCase() === point.toLowerCase()) + 1).map((p) => p.toLowerCase()));
    let before = -1;
    doc.forEach((n, pos) => {
      if (before < 0 && n.type.name === "heading" && later.has(n.textContent.trim().toLowerCase())) before = pos;
    });
    if (before >= 0) {
      editor.chain().focus().insertContentAt(before, block).setTextSelection(before + point.length + 3).scrollIntoView().run();
      return;
    }
    // Otherwise add at the end, reusing a trailing empty line.
    const last = doc.lastChild;
    const end = last && last.type.name === "paragraph" && !last.textContent.trim() ? doc.content.size - last.nodeSize : doc.content.size;
    editor.chain().focus().insertContentAt({ from: end, to: doc.content.size }, block).run();
    const size = editor.state.doc.content.size;
    editor.chain().setTextSelection(size - 1).scrollIntoView().run();
  }

  function addAllPoints() {
    for (const p of outlinePoints) if (!usedPoints.has(p.toLowerCase())) selectPoint(p);
    const first = outlinePoints[0];
    if (first) selectPoint(first);
  }

  /** Blank = nothing written yet except headings (e.g. outline points waiting to be filled). */
  const isBlank = () => {
    let blank = true;
    editor?.state.doc.forEach((n) => {
      if (n.type.name === "heading") return;
      if (n.type.name === "scripture" || n.textContent.trim()) blank = false;
    });
    return blank;
  };

  /** Nothing was written during the sermon: fill the note from the recording (clearly marked as AI). */
  const addSermonNotes = useCallback(
    async (notes: SermonNotes) => {
      if (!editor) return;
      if (!latest.current.title.trim() && notes.title) setTitle(notes.title);
      const nodes: DocNode[] = [
        { type: "paragraph", content: [{ type: "text", text: `✦ ${E.aiNotesLabel}`, marks: [{ type: "highlight" }] }] },
      ];
      const fetchVerse = async (r: string): Promise<DocNode | null> => {
        const ref = parseReference(r);
        if (!ref) return null;
        try {
          const res = await fetch(`/api/verse?ref=${encodeURIComponent(formatReference(ref))}&t=${translation}`);
          if (!res.ok) return null;
          const v = (await res.json()) as Passage;
          return { type: "scripture", attrs: { reference: v.reference, translation: v.translation, verses: v.verses } };
        } catch {
          return null;
        }
      };
      const seen = new Set<string>();
      for (const sec of notes.sections) {
        nodes.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: sec.heading }] });
        const items: DocNode[] = [];
        for (const p of sec.points) {
          const item: DocNode = { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: p.text }] }] };
          // Each verse the preacher mentioned sits under the point where it came up (once per note).
          for (const r of p.refs.slice(0, 3)) {
            const key = r.toLowerCase().replace(/\s+/g, "");
            if (seen.has(key)) continue;
            seen.add(key);
            const card = await fetchVerse(r);
            if (card) item.content!.push(card);
          }
          items.push(item);
        }
        if (items.length) nodes.push({ type: "bulletList", content: items });
        else nodes.push({ type: "paragraph" });
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
        <div className="note-actions">
          <span className={`save-state ${saveState}`} aria-live="polite">
            {saveState === "saving" ? E.saving : saveState === "error" ? E.notSaved : E.saved}
          </span>
          <button type="button" className="icon-btn" onClick={() => setSheet("translate")} aria-label={t.translate.title} title={t.translate.title}>
            <TranslateIcon />
          </button>
          <button type="button" className="icon-btn" onClick={() => setSheet("share")} aria-label={t.share.title} title={t.share.title}>
            <ShareIcon />
          </button>
        </div>
      </div>

      {(sermon || title) && (
        <div className="note-cover">
          <SermonCover title={sermon?.title ?? title} />
        </div>
      )}

      <article className="paper">
        {sermon && <p className="eyebrow" style={{ marginBottom: "0.2rem" }}>{E.sharedByChurch}</p>}
        <textarea
          ref={titleRef}
          className="note-title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus("start");
            }
          }}
          placeholder={E.titlePh}
          aria-label={E.titlePh}
        />
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
            {outlinePoints.length > 0 && (
              <div className="outline-follow" style={{ marginTop: sermon.scriptures.length ? "0.9rem" : 0 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span className="meta">{E.outlineHint}</span>
                  {outlinePoints.some((p) => !usedPoints.has(p.toLowerCase())) && (
                    <button type="button" className="btn ghost small" onMouseDown={(e) => e.preventDefault()} onClick={addAllPoints}>
                      {E.outlineAll}
                    </button>
                  )}
                </div>
                <ul className="outline-points">
                  {outlinePoints.map((p, i) => {
                    const used = usedPoints.has(p.toLowerCase());
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          className={`op ${used ? "used" : ""}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectPoint(p)}
                          aria-label={used ? fmt(E.outlineGo, { p }) : fmt(E.outlineAdd, { p })}
                        >
                          <span className="op-mark" aria-hidden>{used ? "✓" : "+"}</span>
                          <span>{p}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {sermon.recording_url && (
              <p style={{ margin: "0.6rem 0 0" }}>
                <a href={sermon.recording_url} target="_blank" rel="noopener noreferrer">{E.recording}</a>
              </p>
            )}
          </div>
        )}



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
        isBlank={isBlank}
        outline={() => {
          const h = headingsInNote();
          return h.length ? h : outlinePoints;
        }}
        onAddPoints={addMissedPoints}
        onAutoNotes={addSermonNotes}
        slot={recSlot}
      />

      <div className="dock" style={{ bottom: `calc(${kb}px + env(safe-area-inset-bottom, 0px) + 12px)` }}>
        <div className="dock-tools" role="toolbar" aria-label={E.toolbar}>
          {tb(E.tbHeading, fmtState?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), "H1", "txt")}
          {tb(E.tbSubheading, fmtState?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), "H2", "txt")}
          {tb(E.tbBold, fmtState?.bold, () => editor?.chain().focus().toggleBold().run(), <b>B</b>, "txt")}
          {tb(E.tbItalic, fmtState?.italic, () => editor?.chain().focus().toggleItalic().run(), <i style={{ fontFamily: "Georgia, serif" }}>I</i>, "txt")}
          {tb(E.tbHighlight, fmtState?.highlight, () => editor?.chain().focus().toggleHighlight().run(), <span className="tb-hl">A</span>, "txt")}
          {tb(E.tbBullets, fmtState?.bullet, () => editor?.chain().focus().toggleBulletList().run(), <ListIcon />)}
          {tb(E.tbQuote, fmtState?.quote, () => editor?.chain().focus().toggleBlockquote().run(), <QuoteIcon />)}
        </div>
        <button
          type="button"
          className="q-btn"
          onClick={() => setSheet("questions")}
          aria-label={t.questions.title}
          title={t.questions.title}
        >
          <span aria-hidden>?</span>
          {questions.some((q) => !q.sent_at) && <span className="q-count">{questions.filter((q) => !q.sent_at).length}</span>}
        </button>
        <div ref={setRecSlot} className="dock-rec" />
      </div>

      {sheet === "share" && (
        <ShareSheet
          noteId={note.id}
          title={title}
          initialToken={note.share_token ?? null}
          plainText={() => (editor ? editor.getText({ blockSeparator: "\n\n" }) : "")}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "translate" && <TranslateSheet noteId={note.id} onClose={() => setSheet(null)} />}
      {sheet === "questions" && (
        <QuestionsSheet
          questions={questions}
          setQuestions={setQuestions}
          sermon={sermon}
          displayName={displayName}
          title={title}
          onClose={() => setSheet(null)}
        />
      )}
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

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  );
}

function TranslateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5.5 7M11 5c-.6 3.4-3 6.3-6.5 8" />
      <path d="m12 21 4.5-10L21 21M13.6 17.5h5.8" />
    </svg>
  );
}
