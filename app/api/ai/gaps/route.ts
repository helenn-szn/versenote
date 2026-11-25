import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, isSetupError, LANGUAGE_NAMES, withModel } from "@/lib/ai";
import { contentToDoc, docText } from "@/lib/notes/doc";
import { getLocale } from "@/lib/i18n/server";
import type { NoteContent } from "@/lib/types";

export const maxDuration = 60;

type Point = { text: string; refs: string[] };
type Section = { heading: string; points: Point[] };

const cleanPoints = (list: unknown, max: number): Point[] =>
  (Array.isArray(list) ? list : [])
    .filter((p): p is Point => !!p && typeof (p as Point).text === "string" && !!(p as Point).text.trim())
    .slice(0, max)
    .map((p) => ({ text: p.text.trim().slice(0, 600), refs: (Array.isArray(p.refs) ? p.refs : []).filter((r) => typeof r === "string").slice(0, 3) }));

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

  const body = (await request.json().catch(() => ({}))) as { noteId?: string; recordingId?: string; mode?: string };
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

  if (body.mode === "notes") {
    try {
      const ai = await withModel((model) => generateText({
        model,
        maxRetries: 1,
        temperature: 0.2,
        system:
          "You turn a sermon transcript into clear sermon notes for a church member who could not write any. " +
          "Follow the preacher's own structure: a short title, then 2 to 6 sections with a heading each, and 1 to 5 short points per section. " +
          "Stay faithful to what the preacher said; do not add your own teaching, opinions or applications. " +
          "If the preacher referred to Bible passages, give only the references (for example \"John 3:16\") on the point they belong to, exactly as said; never quote verse text. " +
          `Write everything in ${lang}. Reply with JSON only: {"title":"...","sections":[{"heading":"...","points":[{"text":"...","refs":["..."]}]}]}.`,
        prompt: `SERMON TITLE (may be empty): ${note.title ?? ""}\n\nTRANSCRIPT:\n${transcript.slice(0, 120000)}`,
      }));
      const text = ai.result.text;
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { title?: string; sections?: Section[] };
      const sections = (Array.isArray(parsed.sections) ? parsed.sections : [])
        .filter((x) => x && typeof x.heading === "string")
        .slice(0, 6)
        .map((x) => ({ heading: x.heading.trim().slice(0, 160), points: cleanPoints(x.points, 5) }))
        .filter((x) => x.points.length);
      const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 160) : "";
      await supabase.from("note_ai_outputs").insert({ note_id: note.id, kind: "organized", content: JSON.stringify({ title, sections }), model: ai.name });
      return NextResponse.json({ title, sections });
    } catch (e) {
      console.error("notes failed", e);
      if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
  }

  try {
    const ai = await withModel((model) => generateText({
      model,
      maxRetries: 1,
      temperature: 0.2,
      system:
        "You help a church member complete their sermon notes. Compare the member's notes with the sermon transcript. " +
        "List the important points from the sermon that are missing from the notes (main points, key explanations, applications, calls to action). " +
        "Each point is one or two short sentences, faithful to what the preacher said; do not add your own teaching or opinions. " +
        "If the preacher referred to Bible passages for a point, give only the references (for example \"John 3:16\"), exactly as said; never quote verse text. " +
        `Write the points in ${lang}. Reply with JSON only: {"points":[{"text":"...","refs":["..."]}]}. At most 8 points. If nothing important is missing, reply {"points":[]}.`,
      prompt: `SERMON TITLE: ${note.title ?? ""}\n\nMEMBER'S NOTES:\n${notes || "(empty)"}\n\nTRANSCRIPT:\n${transcript.slice(0, 120000)}`,
    }));
    const text = ai.result.text;
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { points?: Point[] };
    const points = cleanPoints(parsed.points, 8);

    await supabase.from("note_ai_outputs").insert({ note_id: note.id, kind: "gaps", content: JSON.stringify(points), model: ai.name });
    return NextResponse.json({ points });
  } catch (e) {
    console.error("gaps failed", e);
    if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
