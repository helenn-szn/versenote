import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { noteText, type Note } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { contentToDoc, countScriptures } from "@/lib/notes/doc";
import SermonCover from "@/components/SermonCover";
import { getI18n } from "@/lib/i18n/server";
import { fmt, LOCALE_TAGS } from "@/lib/i18n/config";

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const N = t.notes;
  const { data } = await supabase
    .from("notes")
    .select("id, sermon_id, title, preacher_name, sermon_date, content, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);

  const needle = q.trim().toLowerCase();
  const notes = ((data ?? []) as Note[]).filter((n) => {
    if (!needle) return true;
    const hay = [n.title, n.preacher_name, n.sermon_date, noteText(n.content)].join(" ").toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{N.eyebrow}</p>
          <h1>{N.title}</h1>
        </div>
        <form action="/notes/new" method="post">
          <button className="btn">{N.newNote}</button>
        </form>
      </div>

      <form className="field" action="/notes">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder={N.search}
          aria-label={N.searchAria}
        />
      </form>

      {notes.length === 0 ? (
        <div className="card tint">
          {needle ? (
            <p style={{ margin: 0 }}>{fmt(N.noMatch, { q })}</p>
          ) : (
            <>
              <strong>{N.emptyTitle}</strong>
              <p className="meta" style={{ margin: 0 }}>{N.emptyText}</p>
            </>
          )}
        </div>
      ) : (
        <div className="list">
          {notes.map((n) => {
            const scriptures = countScriptures(contentToDoc(n.content));
            return (
              <Link key={n.id} href={`/notes/${n.id}`} className="list-item">
                <div className="thumb">
                  <SermonCover title={n.title || ""} rounded={10} />
                </div>
                <div className="body">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{n.title || N.untitled}</strong>
                  {n.sermon_id && <span className="badge">{N.sharedBadge}</span>}
                </div>
                <div className="meta">
                  {[
                    n.preacher_name,
                    formatDate(n.sermon_date, locale),
                    scriptures ? (scriptures === 1 ? N.scriptureOne : fmt(N.scriptureMany, { n: scriptures })) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || fmt(N.edited, { date: new Date(n.updated_at).toLocaleDateString(LOCALE_TAGS[locale]) })}
                </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
