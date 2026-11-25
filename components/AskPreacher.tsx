"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SharedSermon } from "@/lib/types";

type Answer = { body: string; answered_at: string };
type MyQuestion = {
  id: string;
  body: string;
  shown_name: string | null;
  status: "open" | "answered" | "hidden";
  created_at: string;
  question_answers: Answer | Answer[] | null;
};
type PublicQA = { question: string; answer: string; answered_at: string };

const firstAnswer = (a: MyQuestion["question_answers"]) => (Array.isArray(a) ? a[0] : a) ?? null;

export default function AskPreacher({ sermon, initialName }: { sermon: SharedSermon; initialName: string }) {
  const supabase = useRef(createClient()).current;
  const [body, setBody] = useState("");
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [mine, setMine] = useState<MyQuestion[]>([]);
  const [publicQA, setPublicQA] = useState<PublicQA[]>([]);

  const load = useCallback(async () => {
    const [{ data: q }, { data: p }] = await Promise.all([
      supabase
        .from("sermon_questions")
        .select("id, body, shown_name, status, created_at, question_answers(body, answered_at)")
        .eq("sermon_id", sermon.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_public_answers", { p_slug: sermon.slug }),
    ]);
    setMine((q as MyQuestion[] | null) ?? []);
    setPublicQA((p as PublicQA[] | null) ?? []);
  }, [supabase, sermon.id, sermon.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSent(false);
    if (!body.trim()) {
      setError("Write your question first.");
      return;
    }
    if (showName && !name.trim()) {
      setError("Enter the name you'd like the preacher to see, or untick the box.");
      return;
    }
    setBusy(true);
    if (showName && name.trim() !== initialName) {
      const { data: auth } = await supabase.auth.getUser();
      const { error: nameErr } = await supabase
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", auth.user!.id);
      if (nameErr) {
        setBusy(false);
        setError("Couldn't save your name. Try again.");
        return;
      }
    }
    const { error } = await supabase.rpc("ask_question", {
      p_slug: sermon.slug,
      p_body: body.trim(),
      p_show_name: showName,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBody("");
    setSent(true);
    void load();
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <hr className="divider" />
      <h2>Ask the preacher</h2>

      {sermon.questions_open ? (
        <form onSubmit={ask} className="card stack">
          <div>
            <label htmlFor="question">Your question about this message</label>
            <textarea
              id="question"
              className="textarea"
              maxLength={1000}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError("");
                setSent(false);
              }}
              placeholder="What would you like to ask?"
            />
          </div>
          <label className="check">
            <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
            Show my name to the preacher
          </label>
          {showName && (
            <input
              className="input"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name to show"
              aria-label="Name to show"
            />
          )}
          <p className="notice" style={{ margin: 0 }}>
            {showName
              ? "The preacher will see your question and this name."
              : "Anonymous: the preacher sees only your question, never who asked it."}
          </p>
          <button className="btn" disabled={busy}>
            {busy ? "Sending…" : "Send question"}
          </button>
          {error && <p className="error">{error}</p>}
          {sent && <p className="notice">Sent. You&rsquo;ll see the answer here.</p>}
        </form>
      ) : (
        <p className="notice">Questions are closed for this sermon.</p>
      )}

      {mine.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Your questions</h3>
          {mine.map((q) => {
            const a = firstAnswer(q.question_answers);
            return (
              <div className="qa" key={q.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="q">{q.body}</span>
                  <span className={`badge ${a ? "" : "grey"}`}>
                    {a ? "Answered" : q.status === "hidden" ? "Not answered" : "Waiting"}
                  </span>
                </div>
                <div className="meta">{q.shown_name ? `Asked as ${q.shown_name}` : "Asked anonymously"}</div>
                {a && <div className="a">{a.body}</div>}
              </div>
            );
          })}
        </>
      )}

      {publicQA.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Answered for everyone</h3>
          {publicQA.map((qa, i) => (
            <div className="qa" key={i}>
              <div className="q">{qa.question}</div>
              <div className="a">{qa.answer}</div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
