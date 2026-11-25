import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { contentToDoc } from "@/lib/notes/doc";
import { RenderDoc } from "@/lib/notes/render";
import SermonCover from "@/components/SermonCover";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { NoteContent } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false } };

// A note its owner chose to share. Read-only; nothing about the owner is shown.
export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const { data } = await supabase.rpc("get_shared_note", { p_token: token });
  const note = (Array.isArray(data) ? data[0] : data) as
    | { title: string | null; preacher_name: string | null; sermon_date: string | null; content: NoteContent }
    | undefined;
  if (!note) notFound();

  return (
    <div className="note-page shared-note">
      <p className="eyebrow">{t.share.sharedEyebrow}</p>
      {note.title && (
        <div className="note-cover">
          <SermonCover title={note.title} />
        </div>
      )}
      <article className="paper">
        <h1 className="note-title">{note.title || t.notes.untitled}</h1>
        <p className="meta" style={{ marginTop: 0 }}>
          {[note.preacher_name, formatDate(note.sermon_date, locale)].filter(Boolean).join(" · ")}
        </p>
        <RenderDoc doc={contentToDoc(note.content)} />
      </article>
      <div className="card tint" style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 0.75rem" }}>{t.share.cta}</p>
        <Link href="/login?mode=signup" className="btn">
          {t.share.ctaButton}
        </Link>
      </div>
    </div>
  );
}
