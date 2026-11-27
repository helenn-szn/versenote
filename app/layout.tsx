import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileMenu from "@/components/MobileMenu";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { Analytics } from "@vercel/analytics/next";
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
                  <Link href="/pastor" className="desk">{t.nav.share}</Link>
                  <Link href="/account" className="desk">{t.nav.account}</Link>
                </>
              ) : (
                <>
                  <Link href="/#how" className="desk">{t.nav.how}</Link>
                  <Link href="/pastors" className="desk">{t.nav.pastors}</Link>
                  <Link href="/login">{t.nav.signIn}</Link>
                </>
              )}
              <span className="desk nav-tools">
                <LanguageSwitcher signedIn={!!user} />
                <ThemeToggle />
              </span>
              <MobileMenu
                signedIn={!!user}
                links={
                  user
                    ? [{ href: "/account", label: t.nav.account }]
                    : [
                        { href: "/#how", label: t.nav.how },
                        { href: "/pastors", label: t.nav.pastors },
                      ]
                }
              />
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <SiteFooter compact={!!user} />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
