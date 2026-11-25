import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPassage, parseReference } from "@/lib/bible/fetch";
import { toTranslation } from "@/lib/bible/translations";

// GET /api/verse?ref=Gen%201:1&t=BSB  ->  { reference, translation, verses: [{ verse, text }] }
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to look up verses" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const raw = params.get("ref") ?? "";
  const translation = toTranslation(params.get("t"));
  if (raw.length > 80) return NextResponse.json({ error: "Reference too long" }, { status: 400 });
  const ref = parseReference(raw);
  if (!ref) return NextResponse.json({ error: "That doesn't look like a Bible reference" }, { status: 400 });

  // Long ranges are capped at 40 verses for the notebook.
  if (ref.verseStart !== undefined && ref.verseEnd !== undefined && ref.verseEnd - ref.verseStart > 39) {
    ref.verseEnd = ref.verseStart + 39;
  }

  try {
    const passage = await fetchPassage(ref, translation);
    if (!passage) return NextResponse.json({ error: "Couldn't find that passage" }, { status: 404 });
    if (ref.verseStart === undefined && passage.verses.length > 40) {
      passage.verses = passage.verses.slice(0, 40);
      passage.reference = `${ref.book} ${ref.chapter}:1-40`;
    }
    return NextResponse.json(passage);
  } catch {
    return NextResponse.json({ error: "The Bible service is busy. Try again in a moment." }, { status: 502 });
  }
}
