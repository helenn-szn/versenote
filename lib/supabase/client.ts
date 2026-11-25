import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the public anon key only; row-level security in the
// database decides what each signed-in user can read and write.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
