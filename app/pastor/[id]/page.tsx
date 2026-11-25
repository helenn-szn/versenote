import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SermonManager, { type ManagedSermon } from "@/components/SermonManager";
import { toTranslation } from "@/lib/bible/translations";

export default async function ManageSermonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sermons")
    .select(
      "id, slug, title, preacher_name, sermon_date, outline, share_mode, is_active, questions_open, recording_url, sermon_scriptures(id, position, reference, translation, verse_text), sermon_join_counts(joins)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound(); // RLS: only the pastor who owns it can open this page
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("preferred_translation").eq("id", user!.id).maybeSingle();
  return (
    <SermonManager
      initial={data as unknown as ManagedSermon}
      defaultTranslation={toTranslation(profile?.preferred_translation)}
    />
  );
}
