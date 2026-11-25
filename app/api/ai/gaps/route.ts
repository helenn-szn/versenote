import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL, aiAvailable, LANGUAGE_NAMES } from "@/lib/ai";
import { contentToDoc, docText } from "@/lib/notes/doc";
import { getLocale } from "@/lib/i18n/server";
import type { NoteContent } from "@/lib/types";

export const maxDuration = 60;

type Point = { text: string; refs: string[] };

// POST { noteId, recordingId } -> { points: [{ text, refs }] }
// Compares the member's notes with the transcript and lists what they missed.
// The AI may name Bible references it heard, but never writes verse text: the app looks verses up itself.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { noteId?: string; recordingId?: string };
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

  try {
    const { text } = await generateText({
      model: AI_MODEL,
      temperature: 0.2,
      system:
        "You help a church member complete their sermon notes. Compare the member's notes with the sermon transcript. " +
        "List the important points from the sermon that are missing from the notes (main points, key explanations, applications, calls to action). " +
        "Each point is one or two short sentences, faithful to what the preacher said; do not add your own teaching or opinions. " +
        "If the preacher referred to Bible passages for a point, give only the references (for example \"John 3:16\"), exactly as said; never quote verse text. " +
        `Write the points in ${lang}. Reply with JSON only: {"points":[{"text":"...","refs":["..."]}]}. At most 8 points. If nothing important is missing, reply {"points":[]}.`,
      prompt: `SERMON TITLE: ${note.title ?? ""}\n\nMEMBER'S NOTES:\n${notes || "(empty)"}\n\nTRANSCRIPT:\n${transcript.slice(0, 120000)}`,
    });
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { points?: Point[] };
    const points = (parsed.points ?? [])
      .filter((p) => p && typeof p.text === "string" && p.text.trim())
      .slice(0, 8)
      .map((p) => ({ text: p.text.trim().slice(0, 600), refs: (Array.isArray(p.refs) ? p.refs : []).filter((r) => typeof r === "string").slice(0, 3) }));

    await supabase.from("note_ai_outputs").insert({ note_id: note.id, kind: "gaps", content: JSON.stringify(points), model: AI_MODEL });
    return NextResponse.json({ points });
  } catch (e) {
    console.error("gaps failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
