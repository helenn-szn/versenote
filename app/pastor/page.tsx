import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import SermonCover from "@/components/SermonCover";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";

type Row = {
  id: string;
  title: string;
  sermon_date: string | null;
  is_active: boolean;
  sermon_join_counts: { joins: number } | { joins: number }[] | null;
  sermon_questions: { count: number }[];
};

export default async function PastorPage() {
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const P = t.pastor;
  const { data } = await supabase
    .from("sermons")
    .select("id, title, sermon_date, is_active, sermon_join_counts(joins), sermon_questions(count)")
    .order("created_at", { ascending: false });
  const sermons = (data ?? []) as Row[];

  return (
    <div>
      <p className="eyebrow brown">{P.eyebrow}</p>
      <h1>{P.title}</h1>
<p className="meta">{P.lead}</p>

      <form action="/pastor/new" method="post" className="card row">
        <input className="input" style={{ flex: 1, minWidth: 200 }} name="title" required maxLength={200} placeholder={P.titlePh} aria-label={P.titlePh} />
        <button className="btn">{P.create}</button>
      </form>

      {sermons.length === 0 ? (
        <p className="notice">{P.empty}</p>
      ) : (
        <div className="list">
          {sermons.map((s) => {
            const jc = Array.isArray(s.sermon_join_counts) ? s.sermon_join_counts[0] : s.sermon_join_counts;
            const questions = s.sermon_questions?.[0]?.count ?? 0;
            return (
              <Link key={s.id} href={`/pastor/${s.id}`} className="list-item">
                <div className="thumb">
                  <SermonCover title={s.title} rounded={10} />
                </div>
                <div className="body">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{s.title}</strong>
                  <span className={`badge ${s.is_active ? "" : "grey"}`}>{s.is_active ? P.linkOn : P.linkOff}</span>
                </div>
                <div className="meta">
                  {[formatDate(s.sermon_date, locale), fmt(P.joined, { n: jc?.joins ?? 0 }), questions === 1 ? P.questionOne : fmt(P.questionMany, { n: questions })]
                    .filter(Boolean)
                    .join(" · ")}
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
