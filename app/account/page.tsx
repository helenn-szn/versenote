import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import { toTranslation } from "@/lib/bible/translations";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";

export default async function AccountPage() {
  const supabase = await createClient();
  const { t } = await getI18n();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_translation").eq("id", user!.id).maybeSingle();

  return (
    <div>
      <h1>{t.account.title}</h1>
      <p className="meta">{fmt(t.account.signedInAs, { email: user!.email ?? "" })}</p>
      <AccountSettings
        userId={user!.id}
        initialName={profile?.display_name ?? ""}
        initialTranslation={toTranslation(profile?.preferred_translation)}
      />
    </div>
  );
}
