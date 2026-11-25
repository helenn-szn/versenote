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
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
