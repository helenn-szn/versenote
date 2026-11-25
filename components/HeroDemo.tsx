"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import { SHOWCASE } from "@/lib/i18n/verses";

// A looping, self-typing demo of the notebook: a reference is typed, the verse appears.
// Verses are real text from each language's Bible.
export default function HeroDemo() {
  const { locale, t } = useI18n();
  const v = SHOWCASE[locale];
  const DEMOS = [v.rom828, v.ps231, v.isa4319].map((x, k) => ({
    typed: t.demo.typed[k],
    ref: x.ref,
    tr: x.bible ?? v.bible,
    text: x.text,
  }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const d = DEMOS[i];
  return (
    <div className="demo-window" aria-hidden>
      <div className="demo-bar">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="demo-title">{t.demo.title}</span>
        <span className="demo-saved">{t.landing.saved}</span>
      </div>
      <div className="demo-body">
        <div className="demo-meta">{t.demo.meta}</div>
        <p className="demo-line">{t.demo.line1}</p>
        <p className="demo-line">
          {t.demo.line2} <mark>{d.typed.slice(0, chars)}</mark>
          <span className="caret" />
        </p>
        <div className={`demo-verse ${show ? "on" : ""}`}>
          <div className="ref">
            {d.ref} <small>{d.tr}</small>
            <span className="demo-ins">{t.demo.insert}</span>
          </div>
          <div className="text">{d.text}</div>
        </div>
      </div>
    </div>
  );
}
