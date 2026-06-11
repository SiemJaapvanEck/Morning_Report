import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import Link from "next/link";
import { todayLocal } from "@/modules/shared/config";
import { ServiceWorkerRegistratie } from "./components/ServiceWorkerRegistratie";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0eee9" },
    { media: "(prefers-color-scheme: dark)", color: "#14120e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // datumformaat uit het ontwerp: "DO · 11 JUN · 2026"
  const vandaag = new Date(todayLocal() + "T00:00:00");
  const deel = (opties: Intl.DateTimeFormatOptions) =>
    vandaag.toLocaleDateString("nl-NL", opties);
  const datum = `${deel({ weekday: "short" })} · ${deel({ day: "numeric", month: "short" })} · ${deel({ year: "numeric" })}`;

  return (
    <html
      lang="nl"
      className={`${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b bg-card">
          <nav className="mx-auto flex h-[60px] w-full max-w-5xl items-center gap-4 px-5">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-lg font-black tracking-tight sm:text-xl">
                MORNING REPORT
              </span>
              <span className="mr-kicker hidden font-bold text-red sm:inline">
                ● Daily paper
              </span>
            </Link>
            <span className="mr-kicker hidden text-muted md:inline">{datum}</span>
            <span className="flex-1" />
            <div className="mr-kicker flex items-center gap-5">
              <Link href="/archief" className="text-muted transition-colors hover:text-blue">
                Archief
              </Link>
              <Link href="/instellingen" className="text-muted transition-colors hover:text-blue">
                Instellingen
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-7">{children}</main>
        <footer className="mt-8 border-t bg-card">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-5">
            <span className="text-sm font-black tracking-tight">MORNING REPORT</span>
            <span className="mr-kicker text-faint">© 2026 · Daily paper</span>
            <span className="flex-1" />
            <span className="mr-kicker hidden text-faint sm:inline">
              Elke ochtend rond 08:00
            </span>
          </div>
        </footer>
        <ServiceWorkerRegistratie />
      </body>
    </html>
  );
}
