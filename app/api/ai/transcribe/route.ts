import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, isSetupError, LANGUAGE_NAMES, withModel } from "@/lib/ai";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // one 60-second 16 kHz WAV piece is about 1.9 MB

// POST audio/wav (one short piece of a sermon) -> { text }
// The audio is sent to the AI only to be transcribed. It is not stored by this route.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });

  const lang = new URL(request.url).searchParams.get("lang") ?? "";
  // Short recordings are sent as they are (WebM, MP4, M4A, MP3...); longer ones arrive as WAV pieces.
  const type = (request.headers.get("content-type") ?? "audio/wav").split(";")[0].trim().toLowerCase();
  const mediaType = /^(audio|video)\/[a-z0-9.+-]+$/.test(type) ? type : "audio/wav";
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return NextResponse.json({ text: "" });
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  try {
    const ai = await withModel((model) => generateText({
      model,
      maxRetries: 1,
      temperature: 0,
      system:
        "You transcribe church sermons. Write down exactly what is said, in the language it is spoken. " +
        "Do not translate, summarise, explain or add anything. Use paragraphs. " +
        "When the speaker reads a Bible passage, transcribe what they actually said; never fill in verses from memory. " +
        "If a word is unclear write [unclear]. If there is no speech (music, silence), reply with nothing.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transcribe this audio.${LANGUAGE_NAMES[lang] ? ` The app language is ${LANGUAGE_NAMES[lang]}, but keep the language actually spoken.` : ""}`,
            },
            { type: "file", data: bytes, mediaType },
          ],
        },
      ],
    }));
    const text = ai.result.text;
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("transcribe failed", e);
    if (isSetupError(e)) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
