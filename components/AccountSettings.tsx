"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TranslationPicker from "./TranslationPicker";
import type { TranslationId } from "@/lib/bible/translations";

export default function AccountSettings({
  userId,
  initialName,
  initialTranslation,
}: {
  userId: string;
  initialName: string;
  initialTranslation: TranslationId;
}) {
  const supabase = useRef(createClient()).current;
  const [name, setName] = useState(initialName);
  const [nameMsg, setNameMsg] = useState("");
  const [translation, setTranslation] = useState<TranslationId>(initialTranslation);
  const [translationMsg, setTranslationMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", userId);
    setNameMsg(error ? "Couldn't save. Names can be up to 60 characters." : "Saved.");
  }

  // Everything that belongs to you, in one file. RLS means these queries can only return your own rows.
  async function exportData() {
    setExporting(true);
    const [notes, ai, questions, sermons] = await Promise.all([
      supabase.from("notes").select("*").order("created_at"),
      supabase.from("note_ai_outputs").select("*").order("created_at"),
      supabase.from("question_askers").select("sermon_questions(body, shown_name, status, created_at, question_answers(body, answered_at))"),
      supabase.from("sermons").select("*, sermon_scriptures(*)").order("created_at"),
    ]);
    const data = {
      exported_at: new Date().toISOString(),
      profile: { display_name: name || null },
      notes: notes.data ?? [],
      ai_outputs: ai.data ?? [],
      my_questions: (questions.data ?? []).map((r) => (r as { sermon_questions: unknown }).sermon_questions),
      sermons_i_shared: sermons.data ?? [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `versenote-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
  }

  async function deleteAccount() {
    if (confirmText !== "DELETE") {
      setDeleteError('Type DELETE in capitals to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setDeleting(false);
      setDeleteError("Couldn't delete your account. Please try again.");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div>
      <form className="card stack" onSubmit={saveName}>
        <h2>Your name</h2>
        <p className="meta" style={{ margin: 0 }}>
          Only shown to a preacher when you choose to put your name on a question.
        </p>
        <input
          className="input"
          value={name}
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            setNameMsg("");
          }}
          placeholder="Your name"
          aria-label="Your name"
        />
        <div className="row">
          <button className="btn small">Save name</button>
          {nameMsg && <span className="notice">{nameMsg}</span>}
        </div>
      </form>

      <div className="card stack">
        <h2>Bible translation</h2>
        <p className="meta" style={{ margin: 0 }}>
          Used when you look up verses. You can also switch it next to the verse lookup in any note.
        </p>
        <TranslationPicker
          value={translation}
          onChange={(t) => {
            setTranslation(t);
            setTranslationMsg("Saved.");
          }}
        />
        {translationMsg && <span className="notice">{translationMsg}</span>}
      </div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="meta" style={{ margin: 0 }}>
          Download your notes, AI summaries, questions and any sermons you shared, as a JSON file.
        </p>
        <button type="button" className="btn secondary small" onClick={exportData} disabled={exporting}>
          {exporting ? "Preparing…" : "Download my data"}
        </button>
      </div>

      <form action="/auth/signout" method="post" className="card">
        <button className="btn secondary small">Sign out</button>
      </form>

      <div className="card stack" style={{ borderColor: "var(--danger)" }}>
        <h2 style={{ color: "var(--danger)" }}>Delete account</h2>
        <p className="meta" style={{ margin: 0 }}>
          Permanently deletes your account, notes, AI summaries, questions and any sermons you shared. This can&rsquo;t
          be undone.
        </p>
        <input
          className="input"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setDeleteError("");
          }}
          placeholder="Type DELETE to confirm"
          aria-label="Type DELETE to confirm"
        />
        <button type="button" className="btn danger small" onClick={deleteAccount} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
        {deleteError && <p className="error">{deleteError}</p>}
      </div>
    </div>
  );
}
