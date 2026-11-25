import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerseNote: Never miss a word while searching for the Word",
  description:
    "A sermon notebook for churches everywhere. Type a reference and the verse appears; pastors share sermons by QR code; members ask questions afterwards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141110" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="header">
          <div className="header-inner">
            <Link href={user ? "/notes" : "/"} aria-label="VerseNote home" style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
            <nav className="nav" aria-label="Main">
              {user ? (
                <>
                  <Link href="/notes">My notes</Link>
                  <Link href="/pastor" className="hide-sm">Share a sermon</Link>
                  <Link href="/account">Account</Link>
                </>
              ) : (
                <>
                  <Link href="/#how" className="hide-sm">How it works</Link>
                  <Link href="/#pastors" className="hide-sm">For pastors</Link>
                  <Link href="/login">Sign in</Link>
                </>
              )}
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <SiteFooter compact={!!user} />
      </body>
    </html>
  );
}
