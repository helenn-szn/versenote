import { Suspense } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import LoginForm from "./LoginForm";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";
import { getI18n } from "@/lib/i18n/server";
import { SHOWCASE } from "@/lib/i18n/verses";

const PERK_ICONS = ["type", "mic", "ask"] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const pastor = /^\/pastor(\/|$|\?)/.test(sp.next ?? "");
  const signup = !pastor && sp.mode === "signup" && !sp.next?.startsWith("/s/");
  const qr = pastor ? await QRCode.toString("VerseNote", { type: "svg", margin: 0, color: { dark: "#1c1917", light: "#0000" } }) : "";
  const v = SHOWCASE[locale];
  const [before, after = ""] = t.landing.h1.split("{word}");

  // The form keeps the same place in the tree in both layouts, so switching tabs never resets it.
  return (
    <div className={`bleed auth-page ${signup ? "signup" : ""} ${pastor ? "pastor" : ""}`}>
      <div className="auth-grid">
        <div className="auth-left">
          {signup && <span className="su-tag">{t.login.suTag}</span>}
          {pastor && <span className="su-tag pastor-tag">{t.login.pTag}</span>}
          <Suspense>
            <LoginForm />
          </Suspense>
          {pastor && (
            <Link href="/login" className="pa-member">
              {t.login.pMember}
            </Link>
          )}
        </div>

        {pastor ? (
          <aside className="pa-visual" aria-hidden>
            <Photo photo={PHOTOS.homily} width={1200} priority />
            <div className="pa-overlay" />
            <div className="pa-dash">
              <div className="pa-dash-head">
                <div className="pa-qr" dangerouslySetInnerHTML={{ __html: qr }} />
                <div>
                  <strong>{t.landing.sampleTitle}</strong>
                  <span>{t.pastorsPage.thisSunday}</span>
                </div>
              </div>
              <div className="pa-stats">
                <div>
                  <b>128</b>
                  <span>{t.landing.joinedSunday}</span>
                </div>
                <div>
                  <b>3</b>
                  <span>{t.login.pNewQLabel}</span>
                </div>
              </div>
              <div className="pa-q">
                <span className="badge">{t.landing.anonymous}</span>
                <p>{t.pastorsPage.q1}</p>
              </div>
            </div>
            <div className="pa-copy">
              <h2>{t.login.pPanelTitle}</h2>
              <p>{t.login.pPanelText}</p>
            </div>
          </aside>
        ) : signup ? (
          <aside className="su-visual" aria-hidden>
            <div className="su-collage">
              <div className="su-ph a">
                <Photo photo={PHOTOS.choir} width={600} priority />
              </div>
              <div className="su-ph b">
                <Photo photo={PHOTOS.prayerCircle} width={600} />
              </div>
              <div className="su-ph c">
                <Photo photo={PHOTOS.womenPraying} width={600} />
              </div>
            </div>
            <div className="su-copy">
              <h2>{t.login.suTitle}</h2>
              <p>{t.login.suText}</p>
              <div className="su-perks">
                {t.login.suPerks.map((p, i) => (
                  <div className="su-perk" key={i}>
                    <span className="su-ico">
                      <PerkIcon name={PERK_ICONS[i]} />
                    </span>
                    <div>
                      <strong>{p.title}</strong>
                      <span>{p.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : (
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
        )}
      </div>
    </div>
  );
}

function PerkIcon({ name }: { name: "type" | "mic" | "ask" }) {
  const c = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "type")
    return (
      <svg {...c}>
        <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5ZM12 6.5V19" />
      </svg>
    );
  if (name === "mic")
    return (
      <svg {...c}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      </svg>
    );
  return (
    <svg {...c}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 13.6v.1" />
    </svg>
  );
}
