import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emptyContent } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ title: "", sermon_date: new Date().toISOString().slice(0, 10), content: emptyContent() })
    .select("id")
    .single();
  const to = error || !data ? "/notes" : `/notes/${data.id}`;
  return NextResponse.redirect(new URL(to, request.url), { status: 303 });
}
