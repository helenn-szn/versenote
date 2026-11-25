import Link from "next/link";
import QRCode from "qrcode";
import Photo from "@/components/Photo";
import ScrollFX from "@/components/ScrollFX";
import { PHOTOS } from "@/lib/photos";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import { SHOWCASE } from "@/lib/i18n/verses";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.pastorsPage.metaTitle, description: t.pastorsPage.lead };
}

const GIVE_ICONS = ["globe", "mic", "ask", "share"] as const;

// Landing page for pastors and preachers.
export default async function PastorsPage() {
  const { locale, t } = await getI18n();
  const P = t.pastorsPage;
  const L = t.landing;
  const v = SHOWCASE[locale];
  const [h1Before, h1After = ""] = P.h1.split("{word}");
  const qr = await QRCode.toString("VerseNote", { type: "svg", margin: 0, color: { dark: "#1c1917", light: "#0000" } });

  return (
    <div className="landing bleed pastors-page">
      {/* ---------- Hero ---------- */}
      <section className="pp-hero">
        <div className="wide split">
          <div className="pp-hero-copy">
            <h1>
              {h1Before}
              <em className="squiggle">{P.h1Word}</em>
              {h1After}
            </h1>
            <p className="lead">{P.lead}</p>
            <div className="row">
              <Link href="/pastor" className="btn lg">
                {P.start}
              </Link>
              <Link href="#steps" className="btn lg secondary">
                {P.how}
              </Link>
            </div>
          </div>
          <div className="pastor-visual">
            <Photo photo={PHOTOS.homily} width={1100} priority />
            <div className="fc pv-qr">
              <div className="qr-box-sm" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <strong>{L.scan}</strong>
                <span className="meta">{P.thisSunday}</span>
              </div>
            </div>
            <div className="fc pv-joined">
              <span className="big">128</span>
              <span className="meta">{L.joinedSunday}</span>
            </div>
            <div className="fc pv-question">
              <span className="badge">{L.anonymous}</span>
              <p>{P.q1}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Three steps, each with a small picture of the screen ---------- */}
      <section id="steps" className="alt">
        <div className="wide">
          <div className="pp-head">
            <h2 className="section-title">{P.stepsTitle}</h2>
            <p className="lead">{P.stepsLead}</p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-mock">
                {[v.rom828, v.ps231, v.isa4319].map((x) => (
                  <div className="pp-ref" key={x.ref}>
                    <strong>{x.ref}</strong>
                    <span>{x.text}</span>
                  </div>
                ))}
              </div>
              <span className="pp-num">1</span>
              <h3>{P.steps[0].title}</h3>
              <p>{P.steps[0].text}</p>
            </div>
            <div className="pp-step">
              <div className="pp-mock pp-mock-qr">
                <div className="pp-qr" dangerouslySetInnerHTML={{ __html: qr }} />
                <div>
                  <strong>{L.scan}</strong>
                  <span className="meta">{L.sampleTitle}</span>
                </div>
              </div>
              <span className="pp-num">2</span>
              <h3>{P.steps[1].title}</h3>
              <p>{P.steps[1].text}</p>
            </div>
            <div className="pp-step">
              <div className="pp-mock">
                <div className="pp-q">
                  <span className="badge">{L.anonymous}</span>
                  <span>{P.q2}</span>
                </div>
                <div className="pp-q">
                  <span className="badge brown">Ada</span>
                  <span>{P.q3}</span>
                </div>
              </div>
              <span className="pp-num">3</span>
              <h3>{P.steps[2].title}</h3>
              <p>{P.steps[2].text}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What the congregation receives (coral) ---------- */}
      <section className="notebook-sec">
        <div className="nb-glow" aria-hidden />
        <div className="wide">
          <div className="nb-head">
            <h2 className="section-title">{P.giveTitle}</h2>
            <p className="lead">{P.giveLead}</p>
          </div>
          <div className="pp-give">
            {P.give.map((g, i) => (
              <div className="nb-feat" key={i}>
                <span className="nb-ico">
                  <GiveIcon name={GIVE_ICONS[i]} />
                </span>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Questions inbox ---------- */}
      <section>
        <div className="wide split reverse">
          <div className="">
            <h2 className="section-title">{P.inboxTitle}</h2>
            <p className="lead">{P.inboxLead}</p>
          </div>
          <div className="pp-inbox" aria-hidden>
            <div className="pp-inbox-head">
              <strong>{L.sampleTitle}</strong>
              <span className="badge">{P.newQuestions}</span>
            </div>
            <div className="pp-inbox-q">
              <span className="meta">{L.anonymous}</span>
              <p>{P.q1}</p>
              <div className="pp-answer">
                <span>{P.answerPh}</span>
                <span className="pp-publish">✓ {P.publish}</span>
              </div>
            </div>
            <div className="pp-inbox-q">
              <span className="meta">{L.anonymous}</span>
              <p>{P.q2}</p>
            </div>
            <div className="pp-inbox-q">
              <span className="meta">Ada</span>
              <p>{P.q3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Privacy (dark) ---------- */}
      <section className="trust-sec">
        <div className="trust-bg" aria-hidden>
          <Photo photo={PHOTOS.congregation} width={1600} />
        </div>
        <div className="wide trust-inner">
          <div className="trust-head">
            <h2 className="section-title">{P.privacyTitle}</h2>
            <p className="lead">{P.privacyLead}</p>
          </div>
          <div className="pp-see">
            <div className="trust-card">
              <span className="trust-icon" aria-hidden>
                <GiveIcon name="eye" />
              </span>
              <h3>{P.seeTitle}</h3>
              <p>{P.seeText}</p>
            </div>
            <div className="trust-card">
              <span className="trust-icon" aria-hidden>
                <GiveIcon name="lock" />
              </span>
              <h3>{P.neverTitle}</h3>
              <p>{P.neverText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta-sky">
        <div className="wide">
          <div className="cta-panel">
            <div className="cta-panel-copy">
              <h2>{P.ctaTitle}</h2>
              <p>{P.ctaText}</p>
              <div className="row">
                <Link href="/pastor" className="btn lg light">
                  {P.start}
                </Link>
                <Link href="/login?mode=signup" className="btn lg outline-light">
                  {P.ctaMember}
                </Link>
              </div>
            </div>
            <div className="cta-feed" aria-hidden>
              <div className="feed-card">
                <span className="feed-ico dark">128</span>
                <div>
                  <strong>{L.feedJoined}</strong>
                  <span>{L.sampleTitle}</span>
                </div>
              </div>
              <div className="feed-card">
                <span className="feed-ico brown">?</span>
                <div>
                  <strong>{L.feedQuestion}</strong>
                  <span>{L.feedQuestionSub}</span>
                </div>
              </div>
              <div className="feed-card">
                <span className="feed-ico coral">✓</span>
                <div>
                  <strong>{fmt(L.feedInserted, { ref: v.rom828.ref })}</strong>
                  <span>{L.feedInsertedSub}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ScrollFX />
    </div>
  );
}

function GiveIcon({ name }: { name: "globe" | "mic" | "ask" | "share" | "eye" | "lock" }) {
  const c = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "globe":
      return (
        <svg {...c}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
      );
    case "mic":
      return (
        <svg {...c}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </svg>
      );
    case "ask":
      return (
        <svg {...c}>
          <path d="M4 5h16v11H9l-5 4V5Z" />
          <path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 13.6v.1" />
        </svg>
      );
    case "share":
      return (
        <svg {...c}>
          <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
          <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
        </svg>
      );
    case "eye":
      return (
        <svg {...c}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    default:
      return (
        <svg {...c}>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
      );
  }
}
