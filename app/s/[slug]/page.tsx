import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyContent, type SharedSermon } from "@/lib/types";
import { formatDate } from "@/lib/format";
import SermonCover from "@/components/SermonCover";
import { getI18n } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict/en";

// Where the pastor's QR code points. Visitors see a preview and are asked to sign up;
// signed-in members are taken straight into their notebook for this sermon.
export default async function SharedSermonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const S = t.sharePage;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data: preview } = await supabase.rpc("get_sermon_preview", { p_slug: slug });
    if (!preview) return <Inactive S={S} />;
    const p = preview as { title: string; preacher_name: string | null; sermon_date: string | null };
    return (
      <div style={{ maxWidth: 480, margin: "1rem auto" }} className="center">
        <div style={{ marginBottom: "1.25rem" }}>
          <SermonCover title={p.title} rounded={22} />
        </div>
        <p className="eyebrow">{S.invited}</p>
        <h1>{p.title}</h1>
        <p className="meta">
          {[p.preacher_name, formatDate(p.sermon_date, locale)].filter(Boolean).join(" · ")}
        </p>
        <div className="card tint" style={{ textAlign: "left", margin: "1.25rem 0" }}>
          {S.pitch}
        </div>
        <Link className="btn block" href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`}>
          {S.signUp}
        </Link>
        <p className="notice" style={{ marginTop: "0.75rem" }}>
          {S.already}
        </p>
      </div>
    );
  }

  const { data } = await supabase.rpc("get_shared_sermon", { p_slug: slug });
  const sermon = data as SharedSermon | null;
  if (!sermon) return <Inactive S={S} />;

  // One notebook per member per sermon: reopen it if it exists.
  const { data: existing } = await supabase
    .from("notes")
    .select("id")
    .eq("sermon_id", sermon.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/notes/${existing.id}`);

  const { data: created, error } = await supabase
    .from("notes")
    .insert({
      sermon_id: sermon.id,
      title: sermon.title,
      preacher_name: sermon.preacher_name,
      sermon_date: sermon.sermon_date,
      content: emptyContent(sermon.slug),
    })
    .select("id")
    .single();
  if (error || !created) {
    return (
      <div className="card">
        <p className="error">{S.openFail}</p>
      </div>
    );
  }
  await supabase.rpc("record_sermon_join", { p_slug: slug }); // a count only, never who
  redirect(`/notes/${created.id}`);
}

function Inactive({ S }: { S: Dict["sharePage"] }) {
  return (
    <div style={{ maxWidth: 460, margin: "2rem auto" }} className="center">
      <h1>{S.inactiveTitle}</h1>
      <p className="meta">{S.inactiveText}</p>
      <Link href="/" className="btn secondary">
        {S.goHome}
      </Link>
    </div>
  );
}
