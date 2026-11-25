"use client";

import { useEffect, useState } from "react";

// A looping, self-typing demo of the notebook: a reference is typed, the verse appears.
const DEMOS = [
  {
    typed: "Rom 8:28",
    ref: "Romans 8:28",
    tr: "BSB",
    text: "And we know that God works all things together for the good of those who love Him, who are called according to His purpose.",
  },
  { typed: "Ps 23:1", ref: "Psalm 23:1", tr: "KJV", text: "The LORD is my shepherd; I shall not want." },
  {
    typed: "Isaiah 43:19",
    ref: "Isaiah 43:19",
    tr: "BSB",
    text: "Behold, I am about to do something new; even now it springs up—do you not see it?",
  },
];

export default function HeroDemo() {
  const [i, setI] = useState(0);
  const [chars, setChars] = useState(DEMOS[0].typed.length);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    async function loop() {
      let idx = 0;
      await wait(2600);
      while (!cancelled) {
        setShow(false);
        await wait(450);
        idx = (idx + 1) % DEMOS.length;
        setI(idx);
        setChars(0);
        for (let c = 1; c <= DEMOS[idx].typed.length && !cancelled; c++) {
          await wait(95);
          setChars(c);
        }
        await wait(450);
        setShow(true);
        await wait(3200);
      }
    }
    loop();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const d = DEMOS[i];
  return (
    <div className="demo-window" aria-hidden>
      <div className="demo-bar">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="demo-title">The Power of New Beginnings</span>
        <span className="demo-saved">Saved</span>
      </div>
      <div className="demo-body">
        <div className="demo-meta">Shared by your church · Pastor Grace</div>
        <p className="demo-line">God can create something new even when everything seems empty.</p>
        <p className="demo-line">
          He reminded us that <mark>{d.typed.slice(0, chars)}</mark>
          <span className="caret" />
        </p>
        <div className={`demo-verse ${show ? "on" : ""}`}>
          <div className="ref">
            {d.ref} <small>{d.tr}</small>
            <span className="demo-ins">Insert ↵</span>
          </div>
          <div className="text">{d.text}</div>
        </div>
      </div>
    </div>
  );
}
