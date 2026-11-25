"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dict/en";

// Google appears only once it's set up in Supabase (Authentication → Providers → Google)
// and NEXT_PUBLIC_ENABLE_GOOGLE=true is set in Vercel.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true";

type Mode = "signin" | "signup" | "link";

export default function LoginForm() {
  const { t } = useI18n();
  const L = t.login;
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const joining = next.startsWith("/s/");
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>(joining || params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState((params.get("email") ?? "").slice(0, 254));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link" ? L.errLink : null
  );

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSent(false);
    // The page around the form looks different for sign-up, so keep the address in step.
    if (m !== "link") {
      const q = new URLSearchParams(window.location.search);
      if (m === "signup") q.set("mode", "signup");
      else q.delete("mode");
      if (email.trim()) q.set("email", email.trim());
      const qs = q.toString();
      router.replace(`/login${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError(L.errEmail);
    if (mode !== "link" && password.length < 8) return setError(L.errPassword);
    setBusy(true);

    if (mode === "link") {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback(), shouldCreateUser: true },
      });
      setBusy(false);
      if (error) return setError(friendly(error.message, L));
      return setSent(true);
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callback() },
      });
      setBusy(false);
      if (error) return setError(friendly(error.message, L));
      if (!data.session) return setSent(true); // email confirmation is switched on in Supabase
      router.push(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(friendly(error.message, L));
    router.push(next);
    router.refresh();
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) setError(friendly(error.message, L));
  }

  const title = joining ? L.titleJoin : mode === "signup" ? L.titleSignup : mode === "link" ? L.titleLink : L.titleSignin;
  const subtitle = joining ? L.subJoin : mode === "signup" ? L.subSignup : mode === "link" ? L.subLink : L.subSignin;

  return (
    <div className="auth-card">
      <h1>{title}</h1>
      <p className="auth-sub">{subtitle}</p>

      {mode !== "link" && (
        <div className="seg" role="tablist" aria-label={L.tablist}>
          <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => switchMode("signin")}>
            {L.signIn}
          </button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => switchMode("signup")}>
            {L.createAccount}
          </button>
        </div>
      )}

      {sent ? (
        <div className="auth-sent">
          <strong>{L.checkEmail}</strong>
          <p>{fmt(L.sentTo, { email })}</p>
          <button type="button" className="btn ghost small" onClick={() => switchMode("signin")}>
            {L.back}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="auth-form" noValidate>
          <div>
            <label htmlFor="email">{L.email}</label>
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
          {mode !== "link" && (
            <div>
              <label htmlFor="password">{L.password}</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={mode === "signup" ? L.pwNew : L.pwCurrent}
              />
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn block lg" disabled={busy}>
            {busy ? L.wait : mode === "signup" ? L.createAccount : mode === "link" ? L.emailLink : L.signIn}
          </button>
        </form>
      )}

      {!sent && (
        <div className="auth-alt">
          {GOOGLE_ENABLED && (
            <button type="button" className="btn secondary block" onClick={google}>
              <GoogleIcon /> {L.google}
            </button>
          )}
          {mode === "link" ? (
            <button type="button" className="link-btn" onClick={() => switchMode("signin")}>
              {L.usePassword}
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => switchMode("link")}>
              {L.useLink}
            </button>
          )}
        </div>
      )}

      <p className="auth-privacy">
        <LockIcon /> {L.privacy}
      </p>
    </div>
  );
}

function friendly(msg: string, L: Dict["login"]): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return L.errInvalid;
  if (m.includes("already registered")) return L.errRegistered;
  if (m.includes("rate limit") || m.includes("too many")) return L.errRate;
  if (m.includes("not enabled") || m.includes("provider")) return L.errProvider;
  if (m.includes("email not confirmed")) return L.errUnconfirmed;
  return msg;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
