import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { PHOTOS, photoUrl } from "@/lib/photos";
import Photo from "@/components/Photo";
import ScrollFX from "@/components/ScrollFX";
import HeroDemo from "@/components/HeroDemo";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import { SHOWCASE } from "@/lib/i18n/verses";

const STEP_PHOTOS = [PHOTOS.phoneWorship, PHOTOS.phoneBible, PHOTOS.bibleCoffee];
const WORLD = [PHOTOS.choir, PHOTOS.worship, PHOTOS.prayerCircle, PHOTOS.homily, PHOTOS.reader, PHOTOS.womenPraying, PHOTOS.phoneBible];
const TRUST_ICONS = ["book", "eye", "mask", "trash"] as const;

function TrustIcon({ name }: { name: (typeof TRUST_ICONS)[number] }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" />
          <path d="M12 6.5V19" />
          <path d="m8.5 11 1.5 1.5L13 9.5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7a12 12 0 0 1-2.6 3.6M6.4 6.4A12.4 12.4 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7 1.6 0 3-.4 4.3-1.1" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case "mask":
      return (
        <svg {...common}>
          <path d="M4 7c3-1.5 13-1.5 16 0 0 6-3 10-8 10S4 13 4 7Z" />
          <path d="M8 10.5c.8-.6 2-.6 2.8 0M13.2 10.5c.8-.6 2-.6 2.8 0" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
          <path d="M10 11v5M14 11v5" />
        </svg>
      );
  }
}

const AVATARS = [PHOTOS.choir, PHOTOS.homily, PHOTOS.womenPraying, PHOTOS.worship];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/notes");

  const { locale, t } = await getI18n();
  const L = t.landing;
  const v = SHOWCASE[locale];
  const [h1Before, h1After = ""] = L.h1.split("{word}");
  const qr = await QRCode.toString("VerseNote", { type: "svg", margin: 0, color: { dark: "#1c1917", light: "#0000" } });

  return (
    <div className="landing bleed">
      <ScrollFX />
      {/* ---------- Hero ---------- */}
      <section className="hero3">
        <div className="hero3-bg" aria-hidden />
        <div className="wide hero3-copy">
          <h1>
            {h1Before}
            <em className="squiggle">{L.h1Word}</em>
            {h1After}
          </h1>
          <p className="lead">{L.lead}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/login?mode=signup" className="btn lg">
              {L.start}
            </Link>
            <Link href="/pastors" className="btn secondary lg">
              {L.pastor}
            </Link>
          </div>
          <div className="proof" style={{ justifyContent: "center" }}>
            <div className="avatars" aria-hidden>
              {AVATARS.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={photoUrl(p, 96)} alt="" loading="lazy" />
              ))}
            </div>
            <span>{L.proof}</span>
          </div>
        </div>

        <div className="wide stage">
          <div className="stage-photo left">
            <Photo photo={PHOTOS.prayerCircle} width={700} priority />
          </div>
          <div className="stage-photo right">
            <Photo photo={PHOTOS.reader} width={700} priority />
          </div>
          <HeroDemo />
          <div className="stage-chip qr">
            <div className="qr-box-sm" dangerouslySetInnerHTML={{ __html: qr }} />
            <div>
              <strong>{L.scan}</strong>
              <span className="meta">{fmt(L.joined, { n: 128 })}</span>
            </div>
          </div>
          <div className="stage-chip q">
            <span className="badge">{L.anonymous}</span>
            <span>{L.chipQuestion}</span>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="alt">
        <div className="wide">
          <h2 className="section-title">{L.howTitle}</h2>
<p className="lead">{L.howLead}</p>
          <div className="steps">
            {L.steps.map((s, i) => (
              <div className="step" key={i}>
                <div className="step-photo">
                  <Photo photo={STEP_PHOTOS[i]} width={600} />
                  <span className="num">{i + 1}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- For members (coral) ---------- */}
      <section className="notebook-sec">
        <div className="nb-glow" aria-hidden />
        <div className="wide">
          <div className="nb-head">
            <h2 className="section-title">{L.nbTitle}</h2>
<p className="lead">{L.nbLead}</p>
          </div>

          <div className="nb-grid">
            <div className="nb-col">
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="type" /></span>
                <h3>{L.featType}</h3>
                <p>{L.featTypeText}</p>
              </div>
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="book" /></span>
                <h3>{L.featBible}</h3>
                <p>{L.featBibleText}</p>
              </div>
            </div>

            <div className="nb-phone" aria-hidden>
              <div className="phone big">
                <div className="phone-notch" />
                <div className="nbp-top">
                  <span>{L.phoneBack}</span>
                  <span className="saved">{L.saved}</span>
                </div>
                <div className="nbp-cover">
                  <Photo photo={PHOTOS.reader} width={500} />
                </div>
                <div className="phone-meta">{L.sharedByChurch}</div>
                <div className="phone-title">{L.sampleTitle}</div>
                <div className="phone-chips">
                  <span>✓ {v.ps231.ref}</span>
                  <span>+ {L.sampleChip2}</span>
                </div>
                <p className="nbp-text">{L.sampleNote1}</p>
                <div className="scripture" style={{ margin: "0.5rem 0" }}>
                  <div className="ref">
                    {v.ps231.ref}
                    <small>{v.bible}</small>
                  </div>
                  <div className="text" style={{ fontSize: "0.78rem" }}>{v.ps231.text}</div>
                </div>
                <p className="nbp-text">
                  {L.sampleNote2}<span className="caret" />
                </p>
              </div>
            </div>

            <div className="nb-col">
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="lock" /></span>
                <h3>{L.featPrivate}</h3>
                <p>{L.featPrivateText}</p>
              </div>
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="search" /></span>
                <h3>{L.featFind}</h3>
                <p>{L.featFindText}</p>
              </div>
            </div>
          </div>

          <div className="center" style={{ marginTop: "2.5rem" }}>
            <Link href="/login?mode=signup" className="btn lg light">
              {L.create}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- For pastors ---------- */}
      <section id="pastors" className="pastors-spice">
        <div className="pastors-deco" aria-hidden />
        <div className="wide split reverse">
          <div>
            <h2 className="section-title">{L.pastorsTitle}</h2>
<p className="lead">{L.pastorsLead}</p>
            <div className="flow" aria-label={L.flowAria}>
              <span><b>1</b> {L.flow1}</span>
              <i aria-hidden />
              <span><b>2</b> {L.flow2}</span>
              <i aria-hidden />
              <span><b>3</b> {L.flow3}</span>
            </div>
            <div className="row">
              <Link href="/pastor" className="btn brown">
                {L.share}
              </Link>
              <Link href="/pastors" className="btn secondary">
                {t.pastorsPage.how}
              </Link>
            </div>
          </div>
          <div className="pastor-visual">
            <Photo photo={PHOTOS.homily} width={1000} />
            <div className="fc pv-qr">
              <div className="qr-box-sm" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <strong>{L.scan}</strong>
                <span className="meta">{L.sampleTitle}</span>
              </div>
            </div>
            <div className="fc pv-joined">
              <span className="big">128</span>
              <span className="meta">{L.joinedSunday}</span>
            </div>
            <div className="fc pv-question">
              <span className="badge">{L.anonymous}</span>
              <p>{L.pastorQuestion}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Everywhere (brown) ---------- */}
      <section className="world-sec">
        <div className="wide world-head">
          <h2 className="section-title">{L.worldTitle}</h2>
<p className="lead">{L.worldLead}</p>
        </div>
        <div className="marquee" aria-label={L.worldAria}>
          <div className="marquee-track">
            {[...WORLD, ...WORLD].map((photo, i) => (
              <figure className="mq-item" key={i} aria-hidden={i >= WORLD.length}>
                <Photo photo={photo} width={600} />
                <figcaption>
                  <PinIcon />
                  {L.places[i % WORLD.length]}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Trust ---------- */}
      <section id="trust" className="trust-sec">
        <div className="trust-bg" aria-hidden>
          <Photo photo={PHOTOS.smallGroup} width={1600} />
        </div>
        <div className="wide trust-inner">
          <div className="trust-head">
            <h2 className="section-title">{L.trustTitle}</h2>
<p className="lead">{L.trustLead}</p>
          </div>
          <div className="trust-grid">
            {L.trust.map((c, i) => (
              <div className="trust-card" key={i}>
                <span className="trust-icon" aria-hidden>
                  <TrustIcon name={TRUST_ICONS[i]} />
                </span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA (flows into the skyline footer) ---------- */}
      <section className="cta-sky">
        <div className="wide">
          <div className="cta-panel">
            <div className="cta-panel-copy">
              <h2>{L.ctaTitle}</h2>
<p>{L.ctaText}</p>
              <div className="row">
                <Link href="/login?mode=signup" className="btn lg light">
                  {L.ctaStart}
                </Link>
                <Link href="/login?next=/pastor" className="btn lg outline-light">
                  {L.share}
                </Link>
              </div>
            </div>
            <div className="cta-feed" aria-hidden>
              <div className="feed-card">
                <span className="feed-ico coral">✓</span>
                <div>
                  <strong>{fmt(L.feedInserted, { ref: v.rom828.ref })}</strong>
                  <span>{L.feedInsertedSub}</span>
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
                <span className="feed-ico dark">128</span>
                <div>
                  <strong>{L.feedJoined}</strong>
                  <span>{L.sampleTitle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function NbIcon({ name }: { name: "type" | "book" | "lock" | "search" }) {
  const c = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "type")
    return (
      <svg {...c}>
        <path d="M4 7V5h16v2M9 19h6M12 5v14" />
      </svg>
    );
  if (name === "book")
    return (
      <svg {...c}>
        <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5ZM12 6.5V19" />
      </svg>
    );
  if (name === "lock")
    return (
      <svg {...c}>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}
