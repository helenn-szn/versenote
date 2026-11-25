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
        <div className="wide sf-grid">
          <nav className="sf-links" aria-label="Footer">
            <Link href="/#how">How it works</Link>
            <Link href="/#pastors">For pastors</Link>
            <Link href="/#trust">Our promises</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/credits">Credits</Link>
          </nav>

          <div className="sf-center">
            <span className="sf-logo">
              <LogoMark size={40} />
              <span>
                Verse<span>Note</span>
              </span>
            </span>
            <blockquote>
              &ldquo;Thy word is a lamp unto my feet, and a light unto my path.&rdquo;
              <cite>Psalm 119:105 (KJV)</cite>
            </blockquote>
          </div>

          <div className="sf-right">
            <Link href="/login?next=/pastor" className="sf-arrow">
              Share a sermon <span aria-hidden>→</span>
            </Link>
            <span>Made for churches all over the world</span>
            <span>Built for the AI for Church Hackathon 2026</span>
          </div>
        </div>
      </div>
      <div className="sf-bar">
        <div className="wide sf-bar-inner">
          <span>© 2026 VerseNote</span>
          <span>Scripture: KJV, BSB and WEB (public domain)</span>
        </div>
      </div>
    </footer>
  );
}
