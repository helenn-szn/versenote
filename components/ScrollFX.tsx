"use client";

import { useEffect } from "react";

// Landing-page motion: elements fade up as they scroll into view (staggered),
// plus a thin reading-progress bar. Skipped entirely for reduced-motion users.
const TARGETS = [
  ".landing .section-title",
  ".landing .section-title + .lead",
  ".landing .split > *",
  ".landing .step",
  ".landing .place-photo",
  ".landing .trust-card",
  ".landing .flow span",
  ".landing .nb-head",
  ".landing .nb-feat",
  ".landing .nb-phone",
  ".landing .world-head > *",
  ".landing .world-stats > div",
  ".landing .cta-panel",
  ".sky-footer .sf-grid2 > *",
].join(",");

export default function ScrollFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("fx");

    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) {
      return () => {
        window.removeEventListener("scroll", onScroll);
        bar.remove();
      };
    }

    const els = Array.from(document.querySelectorAll<HTMLElement>(TARGETS));
    els.forEach((el) => {
      const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.matches(TARGETS)) : [];
      const i = Math.max(0, siblings.indexOf(el));
      el.classList.add("reveal");
      el.style.transitionDelay = `${Math.min(i, 5) * 90}ms`;
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      bar.remove();
    };
  }, []);

  return null;
}
