import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, isSetupError, LANGUAGE_NAMES, withModel } from "@/lib/ai";
import { contentToDoc, docText } from "@/lib/notes/doc";
import { getLocale } from "@/lib/i18n/server";
import type { NoteContent } from "@/lib/types";

export const maxDuration = 60;

type Point = { text: string; refs: string[]; section?: string };
type Section = { heading: string; points: Point[] };
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

const cleanPoints = (list: unknown, max: number): Point[] =>
  (Array.isArray(list) ? list : [])
    .filter((p): p is Point => !!p && typeof (p as Point).text === "string" && !!(p as Point).text.trim())
    .slice(0, max)
    .map((p) => ({
      text: p.text.trim().slice(0, 600),
      refs: (Array.isArray(p.refs) ? p.refs : []).filter((r) => typeof r === "string").slice(0, 3),
      ...(typeof p.section === "string" && p.section.trim() ? { section: p.section.trim().slice(0, 200) } : {}),
    }));

// POST { noteId, recordingId } -> { points: [{ text, refs }] }
// POST { noteId, recordingId, mode: "notes" } -> { title, sections: [{ heading, points }] }  (for a note with nothing written yet)
// Compares the member's notes with the transcript and lists what they missed.
// The AI may name Bible references it heard, but never writes verse text: the app looks verses up itself.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { noteId?: string; recordingId?: string; mode?: string; outline?: unknown };
  if (!body.noteId || !body.recordingId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // RLS: both queries only return rows that belong to this member.
  const [{ data: note }, { data: rec }] = await Promise.all([
    supabase.from("notes").select("id, title, content").eq("id", body.noteId).maybeSingle(),
    supabase.from("note_recordings").select("id, transcript").eq("id", body.recordingId).eq("note_id", body.noteId).maybeSingle(),
  ]);
  if (!note || !rec) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const transcript = (rec.transcript ?? "").trim();
  if (transcript.length < 40) return NextResponse.json({ error: "no_transcript" }, { status: 400 });

  const notes = docText(contentToDoc(note.content as NoteContent)).slice(0, 30000);
  const lang = LANGUAGE_NAMES[await getLocale()] ?? "English";

  // The pastor's outline (plus any headings the member set up) gives the sections.
  const outline = (Array.isArray(body.outline) ? body.outline : [])
    .filter((x): x is string => typeof x === "string" && !!x.trim())
    .map((x) => x.trim().slice(0, 200))
    .slice(0, 15);

  if (body.mode === "notes") {
    const structure = outline.length
      ? `Use exactly these section headings, word for word and in this order: ${JSON.stringify(outline)}. ` +
        "Work out which part of the sermon belongs under each heading and put those points there. " +
        "If something important fits none of them, add one last section for it. Keep every given heading, even if few points belong to it. "
      : "Follow the preacher's own structure: 2 to 6 sections with a heading each. ";
    try {
      const ai = await withModel((model) => generateText({
        model,
        maxRetries: 1,
        temperature: 0.2,
        system:
          "You turn a sermon transcript into clear sermon notes for a church member who could not write any. " +
          "Give a short title. " +
          structure +
          "Each section has 1 to 6 short points. " +
          "Write the way a church member writes their own notes while listening: plain, direct statements of the teaching itself, " +
          "for example \"God goes ahead of us like a shepherd.\" Never describe the preacher: no \"the preacher said\", \"the pastor explained\", \"he mentioned\" or similar. " +
          "Stay faithful to what the preacher said; do not add your own teaching, opinions or applications. " +
          "List every Bible passage the preacher read or mentioned as a reference (for example \"John 3:16\" or \"Psalm 23:1-4\") on the point where it came up; include chapter and verse when they were said. Never quote verse text. " +
          `Write everything in ${lang}. Reply with JSON only: {"title":"...","sections":[{"heading":"...","points":[{"text":"...","refs":["..."]}]}]}.`,
        prompt: `SERMON TITLE (may be empty): ${note.title ?? ""}\n\nTRANSCRIPT:\n${transcript.slice(0, 120000)}`,
      }));
      const text = ai.result.text;
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { title?: string; sections?: Section[] };
      const sections = (Array.isArray(parsed.sections) ? parsed.sections : [])
        .filter((x) => x && typeof x.heading === "string")
        .slice(0, 16)
        .map((x) => ({ heading: x.heading.trim().slice(0, 160), points: cleanPoints(x.points, 5) }))
        .filter((x) => x.points.length);
      const title = clip(parsed.title, 160);
      await supabase.from("note_ai_outputs").insert({ note_id: note.id, kind: "organized", content: JSON.stringify({ title, sections }), model: ai.name });
      return NextResponse.json({ title, sections });
    } catch (e) {
      console.error("notes failed", e);
      if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
  }

  // With an outline, every missing point is filed under the outline point it belongs to.
  const sectioned = outline.length > 0;
  const max = sectioned ? 14 : 8;
  try {
    const ai = await withModel((model) => generateText({
      model,
      maxRetries: 1,
      temperature: 0.2,
      system:
        "You help a church member complete their sermon notes. Compare the member's notes with the sermon transcript. " +
        "List the important points from the sermon that are missing from the notes (main points, key explanations, illustrations, applications, calls to action). " +
        "Each point is one or two short sentences, faithful to the sermon; do not add your own teaching or opinions. " +
        "Write the way a church member writes their own notes while listening: plain, direct statements of the teaching itself, " +
          "for example \"God goes ahead of us like a shepherd.\" Never describe the preacher: no \"the preacher said\", \"the pastor explained\", \"he mentioned\" or similar. " +
        (sectioned
          ? `The sermon follows this outline: ${JSON.stringify(outline)}. Work out which outline point each part of the sermon belongs to, ` +
            "and give each missing point a \"section\" that is exactly one of those outline points, copied word for word. " +
            "Cover every outline point the member has not written much under. If a point fits none of them, use \"section\":\"\". "
          : "") +
        "List every Bible passage the preacher read or mentioned for a point as references only (for example \"John 3:16\" or \"Psalm 23:1-4\"), with chapter and verse when they were said; never quote verse text. " +
        `Write everything in ${lang}. Reply with JSON only: {"points":[{"text":"...","refs":["..."]${sectioned ? ',"section":"..."' : ""}}]}. ` +
        `At most ${max} points, in the order they came in the sermon. If nothing important is missing, give an empty points list.`,
      prompt: `SERMON TITLE: ${note.title ?? ""}\n\nMEMBER'S NOTES:\n${notes || "(empty)"}\n\nTRANSCRIPT:\n${transcript.slice(0, 120000)}`,
    }));
    const text = ai.result.text;
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { points?: Point[] };
    const known = new Map(outline.map((o) => [o.toLowerCase(), o]));
    // Only keep a section the outline really has (matched loosely), so points never land under a made-up heading.
    const points = cleanPoints(parsed.points, max).map((p) => {
      const s = p.section ? known.get(p.section.toLowerCase().replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()) : undefined;
      return s ? { ...p, section: s } : { text: p.text, refs: p.refs };
    });

    await supabase.from("note_ai_outputs").insert({ note_id: note.id, kind: "gaps", content: JSON.stringify(points), model: ai.name });
    return NextResponse.json({ points });
  } catch (e) {
    console.error("gaps failed", e);
    if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
