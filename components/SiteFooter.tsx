import Link from "next/link";
import { LogoMark } from "./Logo";
import Skyline from "./Skyline";
import { getI18n } from "@/lib/i18n/server";
import { SHOWCASE } from "@/lib/i18n/verses";

export default async function SiteFooter({ compact = false }: { compact?: boolean }) {
  const { locale, t } = await getI18n();
  const f = t.footer;
  const verse = SHOWCASE[locale].ps119;
  const bible = verse.bible ?? SHOWCASE[locale].bible;

  if (compact) {
    return (
      <footer className="footer">
        <div className="wide footer-inner">
          <span>
            <strong style={{ color: "var(--ink)" }}>VerseNote</strong> · {f.tagline}
          </span>
          <span>
            {f.scripture} · <Link href="/credits">{f.credits}</Link>
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="sky-footer">
      <div className="sky-top">
        <Skyline />
      </div>

      <div className="sf-body">
        <div className="wide sf-grid2">
          <div className="sf-brand">
            <Link href="/" className="sf-logo" aria-label={t.nav.home}>
              <LogoMark size={40} />
              <span>
                Verse<span>Note</span>
              </span>
            </Link>
            <blockquote>
              &ldquo;{verse.text}&rdquo;
              <cite>
                {verse.ref} ({bible})
              </cite>
            </blockquote>
          </div>

          <div className="sf-signup">
            <h3>{f.startTitle}</h3>
            <p>{f.startText}</p>
            <form action="/login" method="get" className="sf-form">
              <input type="hidden" name="mode" value="signup" />
              <label htmlFor="footer-email" className="sr-only">
                {f.email}
              </label>
              <input id="footer-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              <button type="submit">{f.getStarted}</button>
            </form>
          </div>

          <nav className="sf-cols" aria-label={f.nav}>
            <div>
              <h4>{f.explore}</h4>
              <Link href="/#how">{f.how}</Link>
              <Link href="/#pastors">{f.pastors}</Link>
              <Link href="/#trust">{f.promises}</Link>
            </div>
            <div>
              <h4>{f.account}</h4>
              <Link href="/login">{f.signIn}</Link>
              <Link href="/login?mode=signup">{f.createAccount}</Link>
              <Link href="/credits">{f.credits}</Link>
            </div>
          </nav>
        </div>
      </div>

      <div className="sf-bar">
        <div className="wide sf-bar-inner">
          <span>{f.copyright}</span>
          <span>
            {f.built} · {f.scripture}
          </span>
        </div>
      </div>
    </footer>
  );
}
