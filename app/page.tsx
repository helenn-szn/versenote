import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { PHOTOS, photoUrl } from "@/lib/photos";
import Photo from "@/components/Photo";
import ScrollFX from "@/components/ScrollFX";
import HeroDemo from "@/components/HeroDemo";

const STEPS = [
  {
    photo: PHOTOS.phoneWorship,
    title: "Scan or start a note",
    text: "Scan your church’s QR code to open this week’s sermon with the outline and scriptures ready. Or start a blank note in a tap.",
  },
  {
    photo: PHOTOS.phoneBible,
    title: "Type the reference",
    text: "Write “Gen 1:1” or “Romans chapter eight verse twenty-eight”. The exact verse appears, ready to insert, in the translation you choose.",
  },
  {
    photo: PHOTOS.bibleCoffee,
    title: "Reflect and ask",
    text: "Come back to your notes during the week, and send the preacher a question, with your name or anonymously.",
  },
];

const WORLD = [
  { photo: PHOTOS.choir, place: "Ibadan, Nigeria" },
  { photo: PHOTOS.worship, place: "New Zealand" },
  { photo: PHOTOS.prayerCircle, place: "Bangkok, Thailand" },
  { photo: PHOTOS.homily, place: "Italy" },
  { photo: PHOTOS.reader, place: "Port Elizabeth, South Africa" },
  { photo: PHOTOS.womenPraying, place: "Canada" },
  { photo: PHOTOS.phoneBible, place: "Argentina" },
];

const TRUST = [
  { icon: "book", title: "Scripture is never made up", text: "Every verse comes word for word from the Bible text, labelled with its translation. AI never writes or changes it." },
  { icon: "eye", title: "Pastors never see your notes", text: "Your notes are private to you, protected in the database itself. Pastors only see how many people joined." },
  { icon: "mask", title: "Ask anonymously", text: "Anonymous questions never reveal who asked, not even to the preacher. Share your name only if you choose." },
  { icon: "trash", title: "Leave any time", text: "Download everything you wrote, or delete your account and all of your data in one step." },
] as const;

function TrustIcon({ name }: { name: (typeof TRUST)[number]["icon"] }) {
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

  const qr = await QRCode.toString("VerseNote", { type: "svg", margin: 0, color: { dark: "#1c1917", light: "#0000" } });

  return (
    <div className="landing bleed">
      <ScrollFX />
      {/* ---------- Hero ---------- */}
      <section className="hero3">
        <div className="hero3-bg" aria-hidden />
        <div className="wide hero3-copy">
          <h1>
            Never miss a word while searching for the <em className="squiggle">Word.</em>
          </h1>
          <p className="lead">
            Take sermon notes and bring in the scripture without leaving the page. When your pastor shares the message,
            today&rsquo;s verses are already waiting.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/login?mode=signup" className="btn lg">
              Start taking notes
            </Link>
            <Link href="/login?next=/pastor" className="btn secondary lg">
              I&rsquo;m a pastor
            </Link>
          </div>
          <div className="proof" style={{ justifyContent: "center" }}>
            <div className="avatars" aria-hidden>
              {AVATARS.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={photoUrl(p, 96)} alt="" loading="lazy" />
              ))}
            </div>
            <span>Made for churches all over the world</span>
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
              <strong>Scan to follow</strong>
              <span className="meta">128 joined</span>
            </div>
          </div>
          <div className="stage-chip q">
            <span className="badge">Anonymous</span>
            <span>What does &ldquo;new&rdquo; mean here?</span>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="alt">
        <div className="wide">
          <h2 className="section-title">Stay with the message.</h2>
          <p className="lead">
            No more switching between a Bible app and a notes app while the sermon carries on without you. VerseNote
            keeps up with the verses so you can keep up with the preacher.
          </p>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div className="step" key={s.title}>
                <div className="step-photo">
                  <Photo photo={s.photo} width={600} />
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
            <h2 className="section-title">One notebook for the sermon and the scripture.</h2>
            <p className="lead">
              Your notes and the verses live side by side, so you never lose your place. Everything saves as you type,
              stays private to you, and is easy to find again on Wednesday night.
            </p>
          </div>

          <div className="nb-grid">
            <div className="nb-col">
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="type" /></span>
                <h3>Verses as you type</h3>
                <p>Write Gen 1:1 or say it the way the preacher does. The exact verse appears, ready to insert.</p>
              </div>
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="book" /></span>
                <h3>Your translation</h3>
                <p>Read in KJV, BSB or WEB. Switch any time and your choice follows you.</p>
              </div>
            </div>

            <div className="nb-phone" aria-hidden>
              <div className="phone big">
                <div className="phone-notch" />
                <div className="nbp-top">
                  <span>‹ My notes</span>
                  <span className="saved">Saved</span>
                </div>
                <div className="nbp-cover">
                  <Photo photo={PHOTOS.reader} width={500} />
                </div>
                <div className="phone-meta">Shared by your church</div>
                <div className="phone-title">The Lord Is My Shepherd</div>
                <div className="phone-chips">
                  <span>✓ Psalm 23:1</span>
                  <span>+ John 10:11</span>
                </div>
                <p className="nbp-text">He doesn&rsquo;t just lead; he goes ahead of us.</p>
                <div className="scripture" style={{ margin: "0.5rem 0" }}>
                  <div className="ref">
                    Psalm 23:1<small>KJV</small>
                  </div>
                  <div className="text" style={{ fontSize: "0.78rem" }}>The LORD is my shepherd; I shall not want.</div>
                </div>
                <p className="nbp-text">
                  Rest is a gift, not a reward<span className="caret" />
                </p>
              </div>
            </div>

            <div className="nb-col">
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="lock" /></span>
                <h3>Private by design</h3>
                <p>Only you can read your notes. Not other members, not your pastor.</p>
              </div>
              <div className="nb-feat">
                <span className="nb-ico"><NbIcon name="search" /></span>
                <h3>Find it again</h3>
                <p>Search every sermon you&rsquo;ve saved by title, preacher or scripture.</p>
              </div>
            </div>
          </div>

          <div className="center" style={{ marginTop: "2.5rem" }}>
            <Link href="/login?mode=signup" className="btn lg light">
              Create your notebook
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- For pastors ---------- */}
      <section id="pastors" className="pastors-spice">
        <div className="pastors-deco" aria-hidden />
        <div className="wide split reverse">
          <div>
            <h2 className="section-title">Put your message in every hand.</h2>
            <p className="lead">
              Add your title, outline and scriptures, then show one QR code on screen or in the bulletin. Members get
              everything in their notebook before you read it, and can ask you questions afterwards. You see how many
              joined, never their private notes.
            </p>
            <div className="flow" aria-label="Three steps for pastors">
              <span><b>1</b> Add scriptures</span>
              <i aria-hidden />
              <span><b>2</b> Show the QR</span>
              <i aria-hidden />
              <span><b>3</b> Answer questions</span>
            </div>
            <Link href="/login?next=/pastor" className="btn brown">
              Share a sermon
            </Link>
          </div>
          <div className="pastor-visual">
            <Photo photo={PHOTOS.homily} width={1000} />
            <div className="fc pv-qr">
              <div className="qr-box-sm" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <strong>Scan to follow</strong>
                <span className="meta">The Lord Is My Shepherd</span>
              </div>
            </div>
            <div className="fc pv-joined">
              <span className="big">128</span>
              <span className="meta">joined this Sunday</span>
            </div>
            <div className="fc pv-question">
              <span className="badge">Anonymous</span>
              <p>What does &ldquo;my cup runneth over&rdquo; mean for us today?</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Everywhere (brown) ---------- */}
      <section className="world-sec">
        <div className="wide world-head">
          <h2 className="section-title">Made for congregations everywhere.</h2>
          <p className="lead">
            From choirs in Nigeria to worship nights in New Zealand and prayer circles in Thailand: wherever the Word is
            preached, VerseNote helps people hold on to it through the week.
          </p>
        </div>
        <div className="marquee" aria-label="Churches around the world">
          <div className="marquee-track">
            {[...WORLD, ...WORLD].map((w, i) => (
              <figure className="mq-item" key={`${w.place}-${i}`} aria-hidden={i >= WORLD.length}>
                <Photo photo={w.photo} width={600} />
                <figcaption>
                  <PinIcon />
                  {w.place}
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
            <h2 className="section-title">Built to honour Scripture and the people reading it.</h2>
            <p className="lead">
              A notebook for something sacred should be trustworthy. These promises are built into how VerseNote works,
              not just written in a policy.
            </p>
          </div>
          <div className="trust-grid">
            {TRUST.map((t) => (
              <div className="trust-card" key={t.title}>
                <span className="trust-icon" aria-hidden>
                  <TrustIcon name={t.icon} />
                </span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
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
              <h2>Bring this Sunday&rsquo;s message home.</h2>
              <p>
                Free for members and churches. Set up this week&rsquo;s sermon in minutes, or open your own notebook and
                carry the Word with you into the week.
              </p>
              <div className="row">
                <Link href="/login?mode=signup" className="btn lg light">
                  Get started free
                </Link>
                <Link href="/login?next=/pastor" className="btn lg outline-light">
                  Share a sermon
                </Link>
              </div>
            </div>
            <div className="cta-feed" aria-hidden>
              <div className="feed-card">
                <span className="feed-ico coral">✓</span>
                <div>
                  <strong>Romans 8:28 inserted</strong>
                  <span>Ada&rsquo;s notebook · just now</span>
                </div>
              </div>
              <div className="feed-card">
                <span className="feed-ico brown">?</span>
                <div>
                  <strong>New anonymous question</strong>
                  <span>&ldquo;How do I start again after failing?&rdquo;</span>
                </div>
              </div>
              <div className="feed-card">
                <span className="feed-ico dark">128</span>
                <div>
                  <strong>People joined this Sunday</strong>
                  <span>The Lord Is My Shepherd</span>
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
