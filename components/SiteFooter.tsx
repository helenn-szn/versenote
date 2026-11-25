import Link from "next/link";
import { LogoMark } from "./Logo";
import Skyline from "./Skyline";

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="footer">
        <div className="wide footer-inner">
          <span>
            <strong style={{ color: "var(--ink)" }}>VerseNote</strong> · Never miss a word while searching for the Word.
          </span>
          <span>
            Scripture: KJV, BSB and WEB (public domain) · <Link href="/credits">Credits</Link>
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
            <Link href="/" className="sf-logo" aria-label="VerseNote home">
              <LogoMark size={40} />
              <span>
                Verse<span>Note</span>
              </span>
            </Link>
            <blockquote>
              &ldquo;Thy word is a lamp unto my feet, and a light unto my path.&rdquo;
              <cite>Psalm 119:105 (KJV)</cite>
            </blockquote>
          </div>

          <div className="sf-signup">
            <h3>Start your notebook</h3>
            <p>Free for members and churches. Your notes stay yours.</p>
            <form action="/login" method="get" className="sf-form">
              <input type="hidden" name="mode" value="signup" />
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input id="footer-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              <button type="submit">Get started</button>
            </form>
          </div>

          <nav className="sf-cols" aria-label="Footer">
            <div>
              <h4>Explore</h4>
              <Link href="/#how">How it works</Link>
              <Link href="/#pastors">For pastors</Link>
              <Link href="/#trust">Our promises</Link>
            </div>
            <div>
              <h4>Account</h4>
              <Link href="/login">Sign in</Link>
              <Link href="/login?mode=signup">Create account</Link>
              <Link href="/credits">Credits</Link>
            </div>
          </nav>
        </div>
      </div>

      <div className="sf-bar">
        <div className="wide sf-bar-inner">
          <span>© 2026 VerseNote · Made for churches all over the world</span>
          <span>Built for the AI for Church Hackathon 2026 · Scripture: KJV, BSB, WEB</span>
        </div>
      </div>
    </footer>
  );
}
