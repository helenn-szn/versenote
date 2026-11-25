import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.title, description: t.meta.description };
}

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
  const { locale, t } = await getI18n();

  return (
    <html lang={LOCALE_TAGS[locale]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <I18nProvider locale={locale} t={t}>
        <header className="header">
          <div className="header-inner">
            <Link href={user ? "/notes" : "/"} aria-label={t.nav.home} style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
            <nav className="nav" aria-label={t.nav.main}>
              {user ? (
                <>
                  <Link href="/notes">{t.nav.notes}</Link>
                  <Link href="/pastor" className="hide-sm">{t.nav.share}</Link>
                  <Link href="/account">{t.nav.account}</Link>
                </>
              ) : (
                <>
                  <Link href="/#how" className="hide-sm">{t.nav.how}</Link>
                  <Link href="/#pastors" className="hide-sm">{t.nav.pastors}</Link>
                  <Link href="/login">{t.nav.signIn}</Link>
                </>
              )}
              <LanguageSwitcher signedIn={!!user} />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <SiteFooter compact={!!user} />
        </I18nProvider>
      </body>
    </html>
  );
}
