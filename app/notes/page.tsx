import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { noteText, type Note } from "@/lib/types";
import { formatDate } from "@/lib/format";
import SermonCover from "@/components/SermonCover";

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
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
          <p className="eyebrow" style={{ margin: 0 }}>Your notebook</p>
          <h1>My notes</h1>
        </div>
        <form action="/notes/new" method="post">
          <button className="btn">+ New note</button>
        </form>
      </div>

      <form className="field" action="/notes">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Search by title, preacher, scripture or words"
          aria-label="Search notes"
        />
      </form>

      {notes.length === 0 ? (
        <div className="card tint">
          {needle ? (
            <p style={{ margin: 0 }}>No notes match &ldquo;{q}&rdquo;.</p>
          ) : (
            <>
              <strong>No notes yet.</strong>
              <p className="meta" style={{ margin: 0 }}>
                Start a new note, or scan your pastor&rsquo;s QR code to open this week&rsquo;s sermon with the
                scriptures ready.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="list">
          {notes.map((n) => {
            const scriptures = n.content.blocks.filter((b) => b.type === "scripture").length;
            return (
              <Link key={n.id} href={`/notes/${n.id}`} className="list-item">
                <div className="thumb">
                  <SermonCover title={n.title || ""} rounded={10} />
                </div>
                <div className="body">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{n.title || "Untitled sermon"}</strong>
                  {n.sermon_id && <span className="badge">Shared by church</span>}
                </div>
                <div className="meta">
                  {[
                    n.preacher_name,
                    formatDate(n.sermon_date),
                    scriptures ? `${scriptures} scripture${scriptures > 1 ? "s" : ""}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || `Edited ${new Date(n.updated_at).toLocaleDateString()}`}
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
