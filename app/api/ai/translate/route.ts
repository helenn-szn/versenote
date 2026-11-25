import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, isSetupError, LANGUAGE_NAMES, withModel } from "@/lib/ai";
import { contentToDoc, type Doc, type DocNode, type ScriptureAttrs } from "@/lib/notes/doc";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BIBLE_FOR_LANG } from "@/lib/bible/translations";
import { fetchPassage, parseReference } from "@/lib/bible/fetch";
import type { NoteContent } from "@/lib/types";

export const maxDuration = 60;

const BATCH_CHARS = 12000;

// POST { noteId, lang } -> { id } of a new, translated copy of the note.
// The member's words are translated by AI. Scripture is never translated by AI:
// each verse is looked up again in a Bible of the target language.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { noteId?: string; lang?: string };
  if (!body.noteId || !isLocale(body.lang)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const lang: Locale = body.lang;

  const { data: note } = await supabase
    .from("notes")
    .select("id, title, preacher_name, sermon_date, content")
    .eq("id", body.noteId)
    .maybeSingle();
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const doc = structuredClone(contentToDoc(note.content as NoteContent)) as Doc;

  // Gather every piece of text the member wrote (and the title), in order.
  const texts: { node: DocNode }[] = [];
  const scriptures: DocNode[] = [];
  const walk = (n: DocNode) => {
    if (n.type === "text" && n.text?.trim()) texts.push({ node: n });
    if (n.type === "scripture") scriptures.push(n);
    n.content?.forEach(walk);
  };
  doc.content.forEach(walk);
  const strings = [note.title ?? "", ...texts.map((t) => t.node.text!)];

  let translated = strings;
  if (strings.some((s) => s.trim())) {
    if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    try {
      translated = await translateAll(strings, LANGUAGE_NAMES[lang] ?? "English");
    } catch (e) {
      console.error("translate failed", e);
      if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
  }
  texts.forEach((t, i) => {
    t.node.text = translated[i + 1] || t.node.text;
  });

  // Scripture from a real Bible in the new language.
  const bible = BIBLE_FOR_LANG[lang];
  await Promise.all(
    scriptures.map(async (n) => {
      const a = n.attrs as ScriptureAttrs;
      const ref = parseReference(a.reference);
      if (!ref) return;
      const p = await fetchPassage(ref, bible).catch(() => null);
      if (p) n.attrs = { reference: p.reference, translation: p.translation, verses: p.verses };
    })
  );

  const { data: copy, error } = await supabase
    .from("notes")
    .insert({
      title: (translated[0] || note.title || "").slice(0, 200),
      preacher_name: note.preacher_name,
      sermon_date: note.sermon_date,
      content: { version: 2, doc, translated_from: note.id, lang },
    })
    .select("id")
    .single();
  if (error || !copy) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ id: copy.id });
}

/** Translate a list of strings, keeping the list the same length and order. */
async function translateAll(strings: string[], language: string): Promise<string[]> {
  const out: string[] = [];
  let batch: string[] = [];
  let size = 0;
  const flush = async () => {
    if (!batch.length) return;
    out.push(...(await translateBatch(batch, language)));
    batch = [];
    size = 0;
  };
  for (const s of strings) {
    if (size + s.length > BATCH_CHARS) await flush();
    batch.push(s);
    size += s.length;
  }
  await flush();
  return out;
}

async function translateBatch(items: string[], language: string): Promise<string[]> {
  const { result } = await withModel((model) =>
    generateText({
      model,
      maxRetries: 1,
      temperature: 0,
      system:
        `Translate church sermon notes into ${language}. You receive a JSON array of strings. ` +
        "Translate each string faithfully and naturally, keeping its meaning, tone and any formatting characters (such as ✦ or bullet symbols). " +
        "Keep Bible references as references, using the book names normally used in that language. Do not add, remove, merge or explain anything. " +
        "Empty strings stay empty. Reply with JSON only: an array with exactly the same number of strings, in the same order.",
      prompt: JSON.stringify(items),
    })
  );
  const text = result.text;
  const parsed = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as unknown[];
  if (!Array.isArray(parsed) || parsed.length !== items.length) throw new Error("translation length mismatch");
  return parsed.map((x, i) => (typeof x === "string" ? x : items[i]));
}
