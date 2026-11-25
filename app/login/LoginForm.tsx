"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

export default function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const linkError = params.get("error") === "link";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "That sign-in link has expired. Try again." : null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) setError(error.message);
  }

  async function emailLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  const joining = next.startsWith("/s/");

  return (
    <div style={{ maxWidth: 420, width: "100%", margin: "1.5rem auto" }}>
      <h1>{joining ? "Sign up to follow along" : "Sign in to VerseNote"}</h1>
      <p className="meta">
        {joining
          ? "Create a free account and the sermon will open in your notebook straight away."
          : "New here? Signing in creates your account."}
      </p>

      <div className="card stack" style={{ marginTop: "1rem" }}>
        <button className="btn secondary block" onClick={google} type="button">
          Continue with Google
        </button>
        <div className="center meta">or</div>
        {sent ? (
          <div className="card tint" style={{ margin: 0 }}>
            <strong>Check your email.</strong>
            <p className="meta" style={{ margin: 0 }}>
              We sent a sign-in link to {email}. Open it on this phone to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={emailLink} className="stack">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
              />
            </div>
            <button className="btn block" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}
        {error && <p className="error">{error}</p>}
      </div>
      <p className="notice">
        We only store your email to sign you in. Your notes are private to you, and you can delete your account at
        any time.
      </p>
    </div>
  );
}
