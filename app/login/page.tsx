import { Suspense } from "react";
import LoginForm from "./LoginForm";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";
import { getI18n } from "@/lib/i18n/server";
import { SHOWCASE } from "@/lib/i18n/verses";

export default async function LoginPage() {
  const { locale, t } = await getI18n();
  const v = SHOWCASE[locale];
  const [before, after = ""] = t.landing.h1.split("{word}");
  return (
    <div className="bleed auth-page">
      <div className="auth-grid">
        <div className="auth-left">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <aside className="auth-visual" aria-hidden>
          <Photo photo={PHOTOS.worship} width={1200} priority />
          <div className="auth-overlay" />
          <div className="auth-float verse">
            <div className="ref">
              {v.ps119.ref} <small>{v.bible}</small>
            </div>
            <div className="text">{v.ps119.text}</div>
          </div>
          <div className="auth-float chip">
            <span className="dot" /> {t.login.panelJoined}
          </div>
          <div className="auth-quote">
            <h2>
              {before}
              <em>{t.landing.h1Word}</em>
              {after}
            </h2>
            <p>{t.login.panelText}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
