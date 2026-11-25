import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { PHOTOS, photoUrl } from "@/lib/photos";
import Photo from "@/components/Photo";
import ScrollFX from "@/components/ScrollFX";

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

const PLACES = [
  { photo: PHOTOS.worship, place: "New Zealand" },
  { photo: PHOTOS.choir, place: "Nigeria" },
  { photo: PHOTOS.congregation, place: "Worship night" },
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
      <section className="hero hero-spice">
        <div className="hero-bg" aria-hidden />
        <div className="wide hero-grid">
          <div className="hero-copy">
            <h1>
              Never miss a word while searching for the{" "}
              <em className="squiggle">Word.</em>
            </h1>
            <p className="lead">
              Take sermon notes and bring in the scripture without leaving the page. When your pastor shares the
              message, today&rsquo;s verses are already waiting.
            </p>
            <div className="row">
              <Link href="/login" className="btn lg">
                Start taking notes
              </Link>
              <Link href="/login?next=/pastor" className="btn secondary lg">
                I&rsquo;m a pastor
              </Link>
            </div>
            <div className="proof">
              <div className="avatars" aria-hidden>
                {AVATARS.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={photoUrl(p, 96)} alt="" loading="lazy" />
                ))}
              </div>
              <span>Made for churches all over the world</span>
            </div>
          </div>

          <div className="collage">
            <div className="collage-main">
              <Photo photo={PHOTOS.prayerCircle} width={1000} priority />
            </div>
            <div className="collage-small">
              <Photo photo={PHOTOS.reader} width={500} />
            </div>

            <div className="fc typing">
              <span className="dot" />
              Rom 8:28
              <span className="caret" />
            </div>

            <div className="fc qr-mini">
              <div className="qr-box-sm" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <strong>Scan to follow</strong>
                <span className="meta">128 joined</span>
              </div>
            </div>

            <div className="fc verse-fc">
              <div className="ref">
                Romans 8:28 <small>BSB</small>
              </div>
              <div className="text">And we know that God works all things together for the good of those who love Him&hellip;</div>
              <span className="inserted">Inserted ✓</span>
            </div>
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
      <section className="band-coral">
        <div className="wide split">
          <Photo photo={PHOTOS.reader} width={1000} />
          <div>
            <h2 className="section-title">One notebook for the sermon and the scripture.</h2>
            <p className="lead">
              Your notes and the verses live side by side, in KJV, BSB or WEB. Everything saves as you type and only
              you can read it. Find any past sermon by its title, preacher or scripture.
            </p>
            <Link href="/login" className="btn dark">
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
      <section className="band-brown">
        <div className="wide">
          <h2 className="section-title">Made for congregations everywhere.</h2>
          <p className="lead">
            From choirs in Nigeria to cathedrals in Italy and worship nights in New Zealand: wherever the Word is
            preached, VerseNote helps people hold on to it through the week.
          </p>
          <div className="photo-band">
            {PLACES.map(({ photo, place }) => (
              <div className="place-photo" key={photo.id}>
                <Photo photo={photo} width={800} />
                <span className="place">{place}</span>
              </div>
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
        <div className="wide cta-sky-inner">
          <div className="cta-card left" aria-hidden>
            <div className="scripture" style={{ margin: 0 }}>
              <div className="ref">
                Lamentations 3:22-23<small>KJV</small>
              </div>
              <div className="text">His compassions fail not. They are new every morning&hellip;</div>
            </div>
          </div>
          <div className="cta-sky-copy">
            <h2>Bring this Sunday&rsquo;s message home.</h2>
            <p>
              Free for members and churches. Set up this week&rsquo;s sermon in minutes, or open your own notebook and
              carry the Word with you into the week.
            </p>
            <div className="row" style={{ justifyContent: "center" }}>
              <Link href="/login" className="btn lg">
                Get started free
              </Link>
              <Link href="/login?next=/pastor" className="btn secondary lg">
                Share a sermon
              </Link>
            </div>
          </div>
          <div className="cta-card right" aria-hidden>
            <span className="badge">Anonymous question</span>
            <p>How do I start again after failing?</p>
            <div className="answer">Answered by Pastor</div>
          </div>
        </div>
      </section>
    </div>
  );
}
