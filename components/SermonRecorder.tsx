"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fileToWavChunks, SermonRecording } from "@/lib/audio";
import { useI18n } from "@/lib/i18n/client";
import { fmt, LOCALE_TAGS } from "@/lib/i18n/config";

const MAX_STORE = 50 * 1024 * 1024; // storage limit per file

type Rec = {
  id: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  transcript: string | null;
  created_at: string;
};
type Point = { text: string; refs: string[] };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function SermonRecorder({
  noteId,
  notesText,
  onAddPoints,
}: {
  noteId: string;
  notesText: () => string;
  onAddPoints: (points: Point[]) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const R = t.rec;
  const supabase = useRef(createClient()).current;

  const [recs, setRecs] = useState<Rec[]>([]);
  const [live, setLive] = useState<{ id: string; seconds: number; paused: boolean } | null>(null);
  const [busy, setBusy] = useState<Record<string, string>>({}); // recording id -> status text
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [top, setTop] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [points, setPoints] = useState<Record<string, { list: Point[]; picked: boolean[] }>>({});
  const recorder = useRef<SermonRecording | null>(null);
  const localFiles = useRef(new Map<string, Blob>());
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("note_recordings")
      .select("id, storage_path, file_name, mime_type, size_bytes, duration_seconds, transcript, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: true });
    setRecs((data as Rec[] | null) ?? []);
  }, [supabase, noteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (id: string, p: Partial<Rec>) => setRecs((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const setStatus = (id: string, s: string) => setBusy((b) => ({ ...b, [id]: s }));
  const clearStatus = (id: string) =>
    setBusy((b) => {
      const n = { ...b };
      delete n[id];
      return n;
    });
  const fail = (id: string, msg: string) => setErrors((e) => ({ ...e, [id]: msg }));

  // ---------- Transcription ----------
  async function transcribePiece(audio: Blob): Promise<string> {
    const res = await fetch(`/api/ai/transcribe?lang=${locale}`, { method: "POST", body: audio, headers: { "Content-Type": audio.type || "audio/wav" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error === "ai_unavailable" ? R.aiOff : R.aiFail);
    return (body.text as string) ?? "";
  }

  async function saveTranscript(id: string, text: string) {
    patch(id, { transcript: text });
    await supabase.from("note_recordings").update({ transcript: text.slice(0, 300000), transcript_lang: locale }).eq("id", id);
  }

  // Live recording: each minute of audio is transcribed while the sermon goes on.
  const liveParts = useRef<string[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  async function startRecording() {
    setTop("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: row, error } = await supabase
      .from("note_recordings")
      .insert({ note_id: noteId, file_name: fmt(R.untitled, { date: new Date().toLocaleString(LOCALE_TAGS[locale]) }), transcript: "" })
      .select("id, storage_path, file_name, mime_type, size_bytes, duration_seconds, transcript, created_at")
      .single();
    if (error || !row) return setTop(R.saveFail);
    const id = (row as Rec).id;
    liveParts.current = [];
    const r = new SermonRecording((wav, index) => {
      if (!wav) return;
      queue.current = queue.current.then(async () => {
        try {
          setStatus(id, R.liveWriting);
          const text = await transcribePiece(wav);
          liveParts.current[index] = text;
          await saveTranscript(id, liveParts.current.filter(Boolean).join("\n\n"));
          clearStatus(id);
        } catch (e) {
          fail(id, (e as Error).message);
          clearStatus(id);
        }
      });
    });
    try {
      await r.start();
    } catch {
      await supabase.from("note_recordings").delete().eq("id", id);
      return setTop(R.micDenied);
    }
    recorder.current = r;
    setRecs((rs) => [...rs, row as Rec]);
    setLive({ id, seconds: 0, paused: false });
    try {
      wake.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    } catch {}
  }

  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => setLive((l) => (l ? { ...l, seconds: recorder.current?.elapsed() ?? l.seconds } : l)), 500);
    return () => clearInterval(iv);
  }, [live?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePause() {
    const r = recorder.current;
    if (!r || !live) return;
    if (r.paused) r.resume();
    else r.pause();
    setLive({ ...live, paused: r.paused });
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r || !live) return;
    const id = live.id;
    setLive(null);
    recorder.current = null;
    wake.current?.release().catch(() => {});
    setStatus(id, R.saving);
    const { file, duration } = await r.stop();
    localFiles.current.set(id, file);
    setUrls((u) => ({ ...u, [id]: URL.createObjectURL(file) }));
    await storeFile(id, file, duration);
    await queue.current; // let the last minute finish transcribing
    clearStatus(id);
  }

  async function storeFile(id: string, file: Blob, duration: number | null) {
    const { data: auth } = await supabase.auth.getUser();
    const ext = (file.type.split("/")[1] ?? "webm").split(";")[0];
    const update: Partial<Rec> = { mime_type: file.type || null, size_bytes: file.size, duration_seconds: duration };
    if (file.size <= MAX_STORE && auth.user) {
      const path = `${auth.user.id}/${noteId}/${id}.${ext}`;
      const { error } = await supabase.storage.from("recordings").upload(path, file, { contentType: file.type || undefined, upsert: true });
      if (!error) update.storage_path = path;
      else fail(id, R.storeFail);
    } else {
      fail(id, R.tooBig);
    }
    patch(id, update);
    await supabase.from("note_recordings").update(update).eq("id", id);
  }

  // ---------- Upload ----------
  async function upload(file: File) {
    setTop("");
    const { data: row, error } = await supabase
      .from("note_recordings")
      .insert({ note_id: noteId, file_name: file.name.slice(0, 200), mime_type: file.type || null, size_bytes: file.size })
      .select("id, storage_path, file_name, mime_type, size_bytes, duration_seconds, transcript, created_at")
      .single();
    if (error || !row) return setTop(R.saveFail);
    const id = (row as Rec).id;
    setRecs((rs) => [...rs, row as Rec]);
    localFiles.current.set(id, file);
    setUrls((u) => ({ ...u, [id]: URL.createObjectURL(file) }));
    setStatus(id, R.saving);
    await storeFile(id, file, null);
    clearStatus(id);
    await transcribe(id);
  }

  async function transcribe(id: string) {
    setErrors((e) => ({ ...e, [id]: "" }));
    let file = localFiles.current.get(id);
    const rec = recs.find((r) => r.id === id);
    try {
      if (!file && rec?.storage_path) {
        setStatus(id, R.preparing);
        const { data } = await supabase.storage.from("recordings").download(rec.storage_path);
        if (data) file = data;
      }
      if (!file) throw new Error(R.noFile);
      // Short files go to the AI whole: no decoding needed in the browser.
      if (file.size <= 3.5 * 1024 * 1024) {
        setStatus(id, fmt(R.transcribing, { done: 0, total: 1 }));
        const type = (file.type || rec?.mime_type || "audio/webm").split(";")[0];
        const text = await transcribePiece(new Blob([file], { type }));
        await saveTranscript(id, text);
        clearStatus(id);
        return;
      }
      setStatus(id, R.preparing);
      let chunks: Blob[];
      let duration: number;
      try {
        ({ chunks, duration } = await fileToWavChunks(file));
      } catch {
        throw new Error(R.decodeFail);
      }
      patch(id, { duration_seconds: duration });
      await supabase.from("note_recordings").update({ duration_seconds: duration }).eq("id", id);
      const out: string[] = new Array(chunks.length).fill("");
      let done = 0;
      setStatus(id, fmt(R.transcribing, { done: 0, total: chunks.length }));
      // Two pieces at a time, kept in order.
      let next = 0;
      const worker = async () => {
        while (next < chunks.length) {
          const i = next++;
          out[i] = await transcribePiece(chunks[i]);
          done++;
          setStatus(id, fmt(R.transcribing, { done, total: chunks.length }));
        }
      };
      await Promise.all([worker(), worker()]);
      await saveTranscript(id, out.filter(Boolean).join("\n\n"));
    } catch (e) {
      fail(id, (e as Error).message);
    }
    clearStatus(id);
  }

  // ---------- Missed points ----------
  async function findGaps(id: string) {
    setErrors((e) => ({ ...e, [id]: "" }));
    setStatus(id, R.gapsLoading);
    void notesText; // the server reads the saved note itself
    try {
      const res = await fetch("/api/ai/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, recordingId: id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error === "ai_unavailable" ? R.aiOff : body.error === "no_transcript" ? R.noTranscript : R.aiFail);
      const list = (body.points as Point[]) ?? [];
      setPoints((p) => ({ ...p, [id]: { list, picked: list.map(() => true) } }));
    } catch (e) {
      fail(id, (e as Error).message);
    }
    clearStatus(id);
  }

  async function addPicked(id: string) {
    const p = points[id];
    if (!p) return;
    const chosen = p.list.filter((_, i) => p.picked[i]);
    setStatus(id, R.adding);
    await onAddPoints(chosen);
    clearStatus(id);
    setPoints((x) => {
      const n = { ...x };
      delete n[id];
      return n;
    });
  }

  async function play(r: Rec) {
    if (urls[r.id] || !r.storage_path) return;
    const { data } = await supabase.storage.from("recordings").createSignedUrl(r.storage_path, 3600);
    if (data?.signedUrl) setUrls((u) => ({ ...u, [r.id]: data.signedUrl }));
  }

  async function remove(r: Rec) {
    if (!window.confirm(R.confirmDelete)) return;
    if (r.storage_path) await supabase.storage.from("recordings").remove([r.storage_path]);
    await supabase.from("note_recordings").delete().eq("id", r.id);
    setRecs((rs) => rs.filter((x) => x.id !== r.id));
  }

  return (
    <section className="card rec-card">
      <div className="rec-head">
        <div>
          <h2 style={{ margin: 0 }}>{R.title}</h2>
          <p className="meta" style={{ margin: "0.2rem 0 0" }}>{R.intro}</p>
        </div>
        {!live && (
          <div className="row">
            <button type="button" className="btn small rec-btn" onClick={startRecording}>
              <span className="rec-dot" aria-hidden /> {R.record}
            </button>
            <label className="btn secondary small">
              {R.upload}
              <input
                type="file"
                accept="audio/*,video/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void upload(f);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {live && (
        <div className="rec-live" role="status">
          <span className={`rec-pulse ${live.paused ? "paused" : ""}`} aria-hidden />
          <strong>{live.paused ? R.paused : R.recording}</strong>
          <span className="rec-time">{clock(live.seconds)}</span>
          <span className="meta hide-sm">{R.keepOpen}</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost small" onClick={togglePause}>
            {live.paused ? R.resume : R.pause}
          </button>
          <button type="button" className="btn small" onClick={stopRecording}>
            {R.stop}
          </button>
        </div>
      )}
      {top && <p className="error">{top}</p>}

      {recs.map((r) => {
        const isLive = live?.id === r.id;
        const isVideo = (r.mime_type ?? "").startsWith("video/");
        const status = busy[r.id];
        const pts = points[r.id];
        return (
          <div className="rec-item" key={r.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong className="rec-name">{r.file_name || R.title}</strong>
              <span className="meta">
                {r.duration_seconds ? clock(r.duration_seconds) : ""}
                {r.storage_path ? "" : r.size_bytes ? ` · ${R.notStored}` : ""}
              </span>
            </div>

            {!isLive && (urls[r.id] ? (
              isVideo ? (
                <video src={urls[r.id]} controls preload="metadata" className="rec-media" />
              ) : (
                <audio src={urls[r.id]} controls preload="metadata" className="rec-media" />
              )
            ) : r.storage_path ? (
              <button type="button" className="btn ghost small" onClick={() => play(r)}>
                ▶ {R.play}
              </button>
            ) : null)}

            {r.transcript ? (
              <details className="rec-transcript" open={isLive}>
                <summary>{isLive ? R.liveTranscript : R.transcript}</summary>
                <div className="rec-text">{r.transcript}</div>
              </details>
            ) : isLive ? (
              <p className="meta">{R.liveHint}</p>
            ) : null}

            {status && <p className="meta rec-status"><span className="spinner" aria-hidden /> {status}</p>}
            {errors[r.id] && <p className="error">{errors[r.id]}</p>}

            {pts && (
              <div className="gaps">
                <strong>{R.gapsTitle}</strong>
                {pts.list.length === 0 ? (
                  <p className="meta">{R.gapsNone}</p>
                ) : (
                  <>
                    {pts.list.map((p, i) => (
                      <label className="check gap-item" key={i}>
                        <input
                          type="checkbox"
                          checked={pts.picked[i]}
                          onChange={(e) =>
                            setPoints((x) => ({ ...x, [r.id]: { ...pts, picked: pts.picked.map((v, j) => (j === i ? e.target.checked : v)) } }))
                          }
                        />
                        <span>
                          {p.text}
                          {p.refs.length > 0 && <span className="meta"> · {p.refs.join(", ")}</span>}
                        </span>
                      </label>
                    ))}
                    <button type="button" className="btn small" onClick={() => addPicked(r.id)} disabled={!pts.picked.some(Boolean)}>
                      {R.addSelected}
                    </button>
                  </>
                )}
              </div>
            )}

            {!isLive && !status && (
              <div className="row" style={{ marginTop: "0.5rem" }}>
                {!r.transcript && (
                  <button type="button" className="btn secondary small" onClick={() => transcribe(r.id)}>
                    {R.transcribe}
                  </button>
                )}
                {r.transcript && !pts && (
                  <button type="button" className="btn small" onClick={() => findGaps(r.id)}>
                    ✦ {R.gaps}
                  </button>
                )}
                <button type="button" className="btn ghost small" onClick={() => remove(r)}>
                  {R.delete}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <p className="notice rec-ai-note">{R.aiNote}</p>
    </section>
  );
}
