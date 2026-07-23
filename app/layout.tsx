import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getProfiles } from "@/app/lib/queries";
import { ServiceWorkerRegistratie } from "./components/ServiceWorkerRegistratie";
import { ThemaKiezer } from "./components/ThemaKiezer";
import { AccountWisselaar } from "./components/AccountWisselaar";
import { schemeCss, schemeBootstrapScript } from "@/app/lib/schemes";
import "./globals.css";

// Before first paint: apply the stored color scheme (no flash). Without a
// stored choice the scheme follows the OS. Both the scheme CSS and the
// bootstrap script are generated from app/lib/schemes.ts (single source).
const themaScript = schemeBootstrapScript();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Morning Report",
  description: "Jouw persoonlijke ochtendrapport",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Morning Report",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Profielen + huidige keuze voor de account-wisselaar in de header. Faalt stil
  // (geen DB-config of -fout) zodat de header altijd rendert.
  let profiles: { id: string; name: string }[] = [];
  let currentProfileId: string | null = null;
  if (hasDbConfig()) {
    try {
      const cookieStore = await cookies();
      currentProfileId = cookieStore.get("mr_profile")?.value ?? null;
      profiles = (await getProfiles()).map((p) => ({ id: p.id, name: p.name }));
    } catch {
      // header valt terug op geen wisselaar
    }
  }

  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <style id="mr-schemes" dangerouslySetInnerHTML={{ __html: schemeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themaScript }} />
        <header className="border-b border-[var(--line)]">
          <nav className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="font-semibold tracking-tight text-[var(--ink)]">
              Morning Report
            </Link>
            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <ThemaKiezer />
              <Link href="/archief" className="hover:text-[var(--ink)]">
                Archief
              </Link>
              <Link href="/financien" className="hover:text-[var(--ink)]">
                Financiën
              </Link>
              <Link href="/instellingen" className="hover:text-[var(--ink)]">
                Instellingen
              </Link>
              <AccountWisselaar profiles={profiles} currentId={currentProfileId} />
            </div>
          </nav>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <ServiceWorkerRegistratie />
      </body>
    </html>
  );
}
