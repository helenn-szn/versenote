"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

/** Phones: account, language and theme live behind a three-line menu button. */
export default function MobileMenu({ signedIn, links }: { signedIn: boolean; links: { href: string; label: string }[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`menu-btn ${open ? "open" : ""}`}
        aria-label={open ? t.nav.closeMenu : t.nav.menu}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      {open &&
        createPortal(
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <div className="menu-panel" id="mobile-menu" role="dialog" aria-label={t.nav.menu}>
            {links.length > 0 && (
              <nav className="menu-links">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={path === l.href ? "page" : undefined}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
            <div className="menu-row">
              <span>{t.nav.language}</span>
              <LanguageSwitcher signedIn={signedIn} />
            </div>
            <div className="menu-row">
              <span>{t.nav.theme}</span>
              <ThemeToggle />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
