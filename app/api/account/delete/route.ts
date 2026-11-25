import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Deletes the signed-in user's own account. The user ID comes from the session,
// never from the request, so nobody can delete someone else's account.
// Database cascades remove everything that belonged to them.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  // Remove the member's sermon recordings from storage first (rows go with the account).
  const { data: recs } = await admin.from("note_recordings").select("storage_path").eq("user_id", user.id);
  const paths = (recs ?? []).map((r) => r.storage_path).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from("recordings").remove(paths.slice(i, i + 100));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
