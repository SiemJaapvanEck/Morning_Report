import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ServiceWorkerRegistratie } from "./components/ServiceWorkerRegistratie";
import { ThemaKiezer } from "./components/ThemaKiezer";
import "./globals.css";

// Vóór de eerste paint: opgeslagen thema toepassen (geen flits). Zonder
// keuze volgt het thema het OS (donker → Nacht).
const themaScript = `(function(){try{var t=localStorage.getItem("mr_thema");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"nacht":"krant";}var h=document.documentElement;h.dataset.theme=t;h.classList.toggle("dark",t==="nacht");}catch(e){}})();`;

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themaScript }} />
        <header className="border-b border-stone-200 dark:border-stone-800">
          <nav className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="font-semibold tracking-tight">
              Morning Report
            </Link>
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <ThemaKiezer />
              <Link href="/archief" className="hover:text-stone-900 dark:hover:text-stone-100">
                Archief
              </Link>
              <Link href="/instellingen" className="hover:text-stone-900 dark:hover:text-stone-100">
                Instellingen
              </Link>
            </div>
          </nav>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <ServiceWorkerRegistratie />
      </body>
    </html>
  );
}
