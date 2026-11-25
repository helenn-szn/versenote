import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import { toTranslation } from "@/lib/bible/translations";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_translation").eq("id", user!.id).maybeSingle();

  return (
    <div>
      <h1>Account</h1>
      <p className="meta">Signed in as {user!.email}</p>
      <AccountSettings
        userId={user!.id}
        initialName={profile?.display_name ?? ""}
        initialTranslation={toTranslation(profile?.preferred_translation)}
      />
    </div>
  );
}
