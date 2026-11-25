import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPassage, parseReference } from "@/lib/bible/fetch";
import { toTranslation, translationLang } from "@/lib/bible/translations";
import { localBookName } from "@/lib/bible/books";
import { getI18n } from "@/lib/i18n/server";

// GET /api/verse?ref=Gen%201:1&t=BSB  ->  { reference, translation, verses: [{ verse, text }] }
export async function GET(request: Request) {
  const supabase = await createClient();
  const { t } = await getI18n();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t.api.signIn }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const raw = params.get("ref") ?? "";
  const translation = toTranslation(params.get("t"));
  if (raw.length > 80) return NextResponse.json({ error: t.api.tooLong }, { status: 400 });
  const ref = parseReference(raw);
  if (!ref) return NextResponse.json({ error: t.api.notRef }, { status: 400 });

  // Long ranges are capped at 40 verses for the notebook.
  if (ref.verseStart !== undefined && ref.verseEnd !== undefined && ref.verseEnd - ref.verseStart > 39) {
    ref.verseEnd = ref.verseStart + 39;
  }

  try {
    const passage = await fetchPassage(ref, translation);
    if (!passage) return NextResponse.json({ error: t.api.notFound }, { status: 404 });
    if (ref.verseStart === undefined && passage.verses.length > 40) {
      passage.verses = passage.verses.slice(0, 40);
      passage.reference = `${localBookName(ref.book, translationLang(translation))} ${ref.chapter}:1-40`;
    }
    return NextResponse.json(passage);
  } catch {
    return NextResponse.json({ error: t.api.busy }, { status: 502 });
  }
}
