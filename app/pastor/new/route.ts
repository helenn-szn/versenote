import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.redirect(new URL("/pastor", request.url), { status: 303 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sermons")
    .insert({ title, sermon_date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  const to = error || !data ? "/pastor" : `/pastor/${data.id}`;
  return NextResponse.redirect(new URL(to, request.url), { status: 303 });
}
