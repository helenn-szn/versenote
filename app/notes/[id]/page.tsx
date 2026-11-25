import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Note, SharedSermon } from "@/lib/types";
import NoteEditor from "@/components/NoteEditor";
import AskPreacher from "@/components/AskPreacher";
import { toTranslation } from "@/lib/bible/translations";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notes")
    .select("id, sermon_id, title, preacher_name, sermon_date, content, updated_at, share_token")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound(); // also what another user sees: RLS hides the row
  const note = data as Note;

  let sermon: SharedSermon | null = null;
  if (note.content.sermon_slug) {
    const { data: s } = await supabase.rpc("get_shared_sermon", { p_slug: note.content.sermon_slug });
    sermon = (s as SharedSermon | null) ?? null;
  }

  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_translation").eq("id", user!.id).maybeSingle();

  return (
    <>
      <NoteEditor note={note} sermon={sermon} defaultTranslation={toTranslation(profile?.preferred_translation)} displayName={profile?.display_name ?? ""} />
      {sermon && <AskPreacher sermon={sermon} initialName={profile?.display_name ?? ""} />}
    </>
  );
}
