"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TranslationPicker from "./TranslationPicker";
import type { TranslationId } from "@/lib/bible/translations";
import { useI18n } from "@/lib/i18n/client";

export default function AccountSettings({
  userId,
  initialName,
  initialTranslation,
}: {
  userId: string;
  initialName: string;
  initialTranslation: TranslationId;
}) {
  const { t } = useI18n();
  const A = t.account;
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
    setNameMsg(error ? A.nameFail : A.saved);
  }

  // Everything that belongs to you, in one file. RLS means these queries can only return your own rows.
  async function exportData() {
    setExporting(true);
    const [notes, ai, questions, sermons, recordings] = await Promise.all([
      supabase.from("notes").select("*").order("created_at"),
      supabase.from("note_ai_outputs").select("*").order("created_at"),
      supabase.from("question_askers").select("sermon_questions(body, shown_name, status, created_at, question_answers(body, answered_at))"),
      supabase.from("sermons").select("*, sermon_scriptures(*)").order("created_at"),
      supabase.from("note_recordings").select("*").order("created_at"),
    ]);
    const data = {
      exported_at: new Date().toISOString(),
      profile: { display_name: name || null },
      notes: notes.data ?? [],
      ai_outputs: ai.data ?? [],
      my_questions: (questions.data ?? []).map((r) => (r as { sermon_questions: unknown }).sermon_questions),
      sermons_i_shared: sermons.data ?? [],
      recordings_and_transcripts: recordings.data ?? [],
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
      setDeleteError(A.typeDelete);
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setDeleting(false);
      setDeleteError(A.deleteFail);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div>
      <form className="card stack" onSubmit={saveName}>
        <h2>{A.nameTitle}</h2>
        <p className="meta" style={{ margin: 0 }}>
          {A.nameNote}
        </p>
        <input
          className="input"
          value={name}
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            setNameMsg("");
          }}
          placeholder={A.namePh}
          aria-label={A.namePh}
        />
        <div className="row">
          <button className="btn small">{A.saveName}</button>
          {nameMsg && <span className="notice">{nameMsg}</span>}
        </div>
      </form>

      <div className="card stack">
        <h2>{A.bibleTitle}</h2>
        <p className="meta" style={{ margin: 0 }}>
          {A.bibleNote}
        </p>
        <TranslationPicker
          value={translation}
          onChange={(t) => {
            setTranslation(t);
            setTranslationMsg(A.saved);
          }}
        />
        {translationMsg && <span className="notice">{translationMsg}</span>}
      </div>

      <div className="card stack">
        <h2>{A.dataTitle}</h2>
        <p className="meta" style={{ margin: 0 }}>
          {A.dataNote}
        </p>
        <button type="button" className="btn secondary small" onClick={exportData} disabled={exporting}>
          {exporting ? A.preparing : A.download}
        </button>
      </div>

      <form action="/auth/signout" method="post" className="card">
        <button className="btn secondary small">{A.signOut}</button>
      </form>

      <div className="card stack" style={{ borderColor: "var(--danger)" }}>
        <h2 style={{ color: "var(--danger)" }}>{A.deleteTitle}</h2>
        <p className="meta" style={{ margin: 0 }}>
          {A.deleteNote}
        </p>
        <input
          className="input"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setDeleteError("");
          }}
          placeholder={A.confirmPh}
          aria-label={A.confirmPh}
        />
        <button type="button" className="btn danger small" onClick={deleteAccount} disabled={deleting}>
          {deleting ? A.deleting : A.deleteBtn}
        </button>
        {deleteError && <p className="error">{deleteError}</p>}
      </div>
    </div>
  );
}
