// De Atlas-dashboardweergave van één editie (was VoorpaginaAtlas). Gebruikt
// voor zowel de homepage (vandaag) als /editie/[datum]: een bold bento-dashboard
// met de blauwe Daily Briefing-hero, een weerstrook, twee data-tegels rechts en
// "Sol's selectie". Op échte data. De kalendernavigatie (vorige/volgende, Today,
// week/maand/jaar) zit in EditionNav + SwipePager eromheen; deze component rendert
// alleen de dag zelf. De "Lees de krant"-knop gaat naar de volledige krant
// (/editie/<datum>/krant) — de Daily Paper-synthese (Redactie) komt later.

import Link from "next/link";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import type { MarktIndex } from "@/modules/shared/types";
import type { EditionView as EditionViewData, SectionView } from "@/app/lib/queries";
import { REGIO_NAAM, type RegioCode } from "@/modules/shared/regios";
import { ItemRating } from "./ItemRating";
import { WereldKaart, regioStats } from "./WereldKaart";
import { MarktenKaart } from "./MarktenKaart";

// Lettertypen van het ontwerp — alleen op deze weergave via de variabel-classes.
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

type KaartItem = SectionView["items"][number] & { categorie: string };

// ── kleine inline-iconen (overgenomen uit design/icons.jsx) ──────────────────
const Icon = {
  Trending: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" />
    </svg>
  ),
  Globe: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </svg>
  ),
  Sources: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  ),
  Arrow: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
    </svg>
  ),
  Pulse: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),
};

// gestreepte foto-placeholder zoals .at-photo in het ontwerp
const PHOTO_CLASS =
  "bg-[repeating-linear-gradient(135deg,rgba(11,11,13,0.055)_0_11px,rgba(11,11,13,0.02)_11px_22px)] " +
  "dark:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.07)_0_11px,rgba(255,255,255,0.025)_11px_22px)]";

const TILE = "rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900";

function fmtDatum(date: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(date + "T00:00:00").toLocaleDateString("nl-NL", opts);
}

// ── de blauwe Daily Briefing-hero ────────────────────────────────────────────
function BriefingHero({
  hasEdition,
  date,
  krantHref,
  headline,
  intro,
  bullets,
  stats,
}: {
  hasEdition: boolean;
  date: string;
  krantHref: string;
  headline: string;
  intro: string | null;
  bullets: KaartItem[];
  stats: { artikelen: number; secties: number; bronnen: number };
}) {
  const datumKort = fmtDatum(date, { day: "numeric", month: "short" }).toUpperCase();

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-[#2f6df0] p-7 text-white sm:p-8">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-white ring-4 ring-white/25" />
        <span className="font-[family-name:var(--font-archivo)] text-[11px] font-bold tracking-[0.2em]">
          DAGELIJKSE BRIEFING
        </span>
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold tracking-wide opacity-85">
          {datumKort} · OCHTENDEDITIE
        </span>
      </div>

      <h1 className="mt-5 text-balance font-[family-name:var(--font-archivo)] text-[28px] font-extrabold leading-[1.04] tracking-tight sm:text-[34px]">
        {headline}
      </h1>
      {intro && <p className="mt-4 max-w-xl text-[15px] leading-relaxed opacity-90">{intro}</p>}

      {/* statstrook */}
      <div className="mt-6 flex gap-7 border-t border-white/20 pt-5">
        {[
          [String(stats.artikelen), "artikelen"],
          [String(stats.secties), "secties"],
          [String(stats.bronnen), "bronnen"],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="font-[family-name:var(--font-archivo)] text-[26px] font-extrabold leading-none tracking-tight">{n}</div>
            <div className="mt-1 text-[11px] font-semibold opacity-80">{l}</div>
          </div>
        ))}
      </div>

      {/* meest interessant vandaag */}
      {bullets.length > 0 && (
        <>
          <div className="mt-auto pt-6 font-[family-name:var(--font-archivo)] text-[11px] font-bold tracking-[0.15em] opacity-80">
            MEEST INTERESSANT
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {bullets.map((b) => {
              const inhoud = (
                <>
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rotate-45 rounded-[2px] bg-white/90" />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-snug">{b.title}</span>
                    <span className="mt-0.5 block font-[family-name:var(--font-space-mono)] text-[10.5px] opacity-75">
                      {b.categorie}{b.source_name ? ` · ${b.source_name}` : ""}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={b.id} className="group flex gap-3 transition-transform hover:translate-x-1">
                  {b.url ? (
                    <a href={b.url} target="_blank" rel="noreferrer" className="flex gap-3">
                      {inhoud}
                    </a>
                  ) : (
                    inhoud
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {hasEdition && (
        <div className="mt-6">
          <Link
            href={krantHref}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-[family-name:var(--font-archivo)] text-[13px] font-extrabold text-[#2f6df0] transition-transform hover:-translate-y-0.5"
          >
            Lees de krant <Icon.Arrow className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── lege-hero (nog geen editie op deze dag) ──────────────────────────────────
function LegeHero({ date, isToday }: { date: string; isToday: boolean }) {
  const datum = fmtDatum(date, { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex flex-1 flex-col justify-center rounded-2xl bg-[#2f6df0] p-8 text-white">
      <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wide opacity-85">{datum}</span>
      <h1 className="mt-3 font-[family-name:var(--font-archivo)] text-[30px] font-extrabold tracking-tight">
        {isToday ? "Nog geen editie vandaag" : "Geen editie op deze dag"}
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed opacity-90">
        {isToday
          ? "De pipeline draait 's ochtends tussen 06:30 en 08:15. Zodra Sol klaar is, verschijnt hier de briefing van vandaag."
          : "Op deze datum is er geen editie samengesteld. Blader met de pijlen of de kalender naar een dag met nieuws."}
      </p>
    </div>
  );
}

// ── weerstrook (echte data) ──────────────────────────────────────────────────
function WeerStrook({ weather }: { weather: import("@/modules/shared/types").WeatherSnapshot | null }) {
  return (
    <div className={`${TILE} flex flex-wrap items-end gap-x-8 gap-y-4 p-6`}>
      <div className="flex w-full items-center gap-2">
        <Icon.Globe className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">
          Weer — {weather?.plaats ?? "onbekend"}
        </span>
      </div>
      {weather ? (
        <>
          <div className="flex items-end gap-4">
            <span className="font-[family-name:var(--font-archivo)] text-[52px] font-extrabold leading-[0.8] tracking-tighter">
              {Math.round(weather.temp_nu)}°
            </span>
            <div className="pb-1">
              <div className="text-[14px] font-bold">{weather.omschrijving}</div>
              <div className="mt-1 font-[family-name:var(--font-space-mono)] text-[11px] text-stone-500">
                H {Math.round(weather.temp_max)}° · L {Math.round(weather.temp_min)}°
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            {[
              [`${weather.neerslag_kans}%`, "regen"],
              [`${Math.round(weather.wind_kmh)} km/h`, "wind"],
            ].map(([v, l]) => (
              <div key={l} className="text-right">
                <div className="font-[family-name:var(--font-archivo)] text-[15px] font-extrabold tracking-tight">{v}</div>
                <div className="mt-0.5 text-[10px] font-semibold text-stone-400">{l}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-stone-400">geen weergegevens</p>
      )}
    </div>
  );
}

// ── "Waar het nieuws vandaan komt" — stippen-wereldkaart op échte regio-tellingen ─
function WereldKaartTegel({
  counts,
  selectedRegio,
  basePath,
}: {
  counts: Record<string, number>;
  selectedRegio?: string | null;
  basePath: string;
}) {
  const { topCode, topAantal } = regioStats(counts);
  const selNaam = selectedRegio ? REGIO_NAAM[selectedRegio as RegioCode] : null;
  return (
    <div className={`${TILE} flex flex-1 flex-col p-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon.Globe className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Waar het nieuws vandaan komt</span>
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold tracking-widest text-stone-400">KLIK EEN REGIO</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <WereldKaart counts={counts} selectedRegio={selectedRegio} basePath={basePath} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10.5px] font-semibold text-stone-400">Minder</span>
        <span className="h-[7px] flex-1 rounded-full bg-[linear-gradient(90deg,rgba(47,109,240,0.16),rgba(47,109,240,1))]" />
        <span className="text-[10.5px] font-semibold text-stone-400">Meer</span>
        {selNaam ? (
          <Link href={`${basePath}#sol-selectie`} className="whitespace-nowrap rounded-full bg-[#2f6df0] px-2.5 py-1 font-[family-name:var(--font-archivo)] text-[10px] font-extrabold text-white hover:opacity-90">
            {selNaam} ✕
          </Link>
        ) : topAantal > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-[#2f6df0] px-2.5 py-1 font-[family-name:var(--font-archivo)] text-[10px] font-extrabold text-white">
            {REGIO_NAAM[topCode]} heetst
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── "Markten per regio" — rood/groen-stippenkaart + indexlijst (beurssnapshot) ─
function MarktenTegel({ indices }: { indices: MarktIndex[] }) {
  const lijst = [...indices].sort((a, b) => b.d - a.d); // hoog → laag rendement
  const kleur = (d: number) => (d >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");
  return (
    <div className={`${TILE} flex flex-1 flex-col p-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon.Pulse className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Markten per regio</span>
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold tracking-widest text-stone-400">SNAPSHOT</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <MarktenKaart indices={indices} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10.5px] font-semibold text-stone-400">Verlies</span>
        <span className="h-[7px] flex-1 rounded-full bg-[linear-gradient(90deg,rgba(220,38,38,1),rgba(220,38,38,0.2),rgba(22,163,74,0.2),rgba(22,163,74,1))]" />
        <span className="text-[10.5px] font-semibold text-stone-400">Winst</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {lijst.map((ix) => (
          <div key={ix.symbool} className="flex items-center gap-2 py-0.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ix.d >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="truncate text-[12px] font-semibold" title={REGIO_NAAM[ix.regio as RegioCode]}>{ix.naam}</span>
            <span className="flex-1" />
            <span className={`font-[family-name:var(--font-archivo)] text-[12px] font-extrabold ${kleur(ix.d)}`}>
              {ix.d >= 0 ? "+" : ""}{ix.d.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── "Waar Sol vandaag las" — top bronnen als balken (terugval voor de kaart) ──
function BronnenTegel({ bronnen }: { bronnen: { naam: string; n: number }[] }) {
  const max = Math.max(1, ...bronnen.map((b) => b.n));
  return (
    <div className={`${TILE} flex flex-col p-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon.Globe className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Waar Sol las</span>
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold tracking-widest text-stone-400">PER BRON</span>
      </div>
      {bronnen.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {bronnen.map((b) => (
            <div key={b.naam} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[12px] font-semibold" title={b.naam}>{b.naam}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <span className="block h-full rounded-full bg-[#2f6df0]" style={{ width: `${(b.n / max) * 100}%` }} />
              </span>
              <span className="w-5 shrink-0 text-right font-[family-name:var(--font-archivo)] text-[12px] font-extrabold">{b.n}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">geen bronnen op deze dag</p>
      )}
    </div>
  );
}

// ── één verhaalkaart in het grid ─────────────────────────────────────────────
function VerhaalKaart({ item }: { item: KaartItem }) {
  const pct = item.match_score != null ? Math.round(item.match_score * 100) : null;
  return (
    <div className={`${TILE} flex flex-col overflow-hidden`}>
      <div className={`relative h-40 ${item.image_url ? "" : PHOTO_CLASS}`}>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- externe feed-afbeeldingen, domeinen onbekend
          <img src={item.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#2f6df0] px-2.5 py-1 font-[family-name:var(--font-archivo)] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
            {item.categorie}
          </span>
          {pct != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400">
              <Icon.Trending className="h-3 w-3" />{pct}% match
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-3 font-[family-name:var(--font-archivo)] text-[19px] font-extrabold leading-[1.14] tracking-tight">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">{item.title}</a>
          ) : (
            item.title
          )}
        </h3>
        {item.summary_text && (
          <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-stone-500 dark:text-stone-400">{item.summary_text}</p>
        )}
        <div className="my-3.5 flex items-center gap-4 text-[11.5px] font-semibold text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f6df0] text-[9px] font-extrabold text-white">S</span>
            Sol
          </span>
          {item.source_name && (
            <span className="inline-flex items-center gap-1.5"><Icon.Sources className="h-3 w-3" />{item.source_name}</span>
          )}
        </div>
        <div className="h-px bg-stone-200 dark:bg-stone-800" />
        <div className="mt-3.5">
          <p className="font-[family-name:var(--font-archivo)] text-[10.5px] font-extrabold tracking-[0.1em] text-stone-400">
            HOE GOED PAST DIT BIJ JE?
          </p>
          <div className="mt-2"><ItemRating targetType="item" targetId={item.item_id} /></div>
        </div>
      </div>
    </div>
  );
}

// ── hoofdcomponent: één editie als Atlas-dashboard ───────────────────────────
export function EditionView({
  view,
  date,
  isToday,
  profileName,
  selectedRegio,
}: {
  view: EditionViewData | null;
  date: string;
  isToday: boolean;
  profileName?: string;
  selectedRegio?: string | null;
}) {
  const basePath = isToday ? "/" : `/editie/${date}`;
  const weather = view?.sections.find((s) => s.section.kind === "weather")?.weather ?? null;

  const categorySections = (view?.sections ?? []).filter((s) => s.section.kind === "category");
  const allItems: KaartItem[] = categorySections.flatMap((s) =>
    s.items.map((item) => ({ ...item, categorie: s.section.title })),
  );
  const ranked = [...allItems].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

  const stats = {
    artikelen: allItems.length,
    secties: categorySections.length,
    bronnen: new Set(allItems.map((i) => i.source_name).filter(Boolean)).size,
  };

  // top bronnen op aantal items (terugval voor de kaart)
  const bronTel = new Map<string, number>();
  for (const it of allItems) if (it.source_name) bronTel.set(it.source_name, (bronTel.get(it.source_name) ?? 0) + 1);
  const topBronnen = [...bronTel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([naam, n]) => ({ naam, n }));

  // regio-tellingen voor de wereldkaart (gezet door de pipeline bij finalize)
  const regios = view?.edition.front_page?.regios ?? {};
  const geo = regioStats(regios);
  const toonKaart = geo.totaal >= 3 && geo.actief >= 2;

  // beurssnapshot voor de markten-kaart (leeg → tegel wordt niet getoond)
  const markten = view?.edition.front_page?.markten?.indices ?? [];

  const intro = view?.edition.front_page?.intro ?? null;
  const headline = ranked[0]?.title ?? "Je editie staat klaar";
  const bullets = ranked.slice(1, 6); // kop is al de #1 — niet herhalen

  // klik op een continent → filter de selectie op die regio (via ?regio=…)
  const regioFilter = selectedRegio && selectedRegio in REGIO_NAAM ? selectedRegio : null;
  const regioNaam = regioFilter ? REGIO_NAAM[regioFilter as RegioCode] : null;
  const kaarten = regioFilter ? ranked.filter((it) => it.regio === regioFilter) : ranked.slice(0, 8);

  const datumLang = fmtDatum(date, { weekday: "long", day: "numeric", month: "long" });
  const initialen = (profileName ?? "Lezer").trim().slice(0, 2).toUpperCase();

  return (
    <div className={`${grotesk.variable} ${archivo.variable} ${spaceMono.variable} font-[family-name:var(--font-grotesk)]`}>
      <div>
        {/* datumstrook met avatar */}
        <div className="flex items-center gap-3 pb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2f6df0]" />
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-widest text-stone-500">
            {datumLang}{isToday ? " · vandaag" : ""}
          </span>
          <span className="flex-1" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f6df0] text-[12px] font-bold text-white">
            {initialen}
          </span>
        </div>

        {/* bento */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* linkerkolom: hero + weer */}
          <div className="flex flex-col gap-3 lg:col-span-7">
            {view ? (
              <BriefingHero
                hasEdition
                date={date}
                krantHref={`${basePath === "/" ? `/editie/${date}` : basePath}/krant`}
                headline={headline}
                intro={intro}
                bullets={bullets}
                stats={stats}
              />
            ) : (
              <LegeHero date={date} isToday={isToday} />
            )}
            <WeerStrook weather={weather} />
          </div>

          {/* rechterkolom: nieuwskaart (of bronnen-balken) + marktenkaart */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {toonKaart ? <WereldKaartTegel counts={regios} selectedRegio={selectedRegio} basePath={basePath} /> : <BronnenTegel bronnen={topBronnen} />}
            {markten.length > 0 && <MarktenTegel indices={markten} />}
          </div>
        </div>

        {/* Sol's selectie — filtert op regio bij klik op de kaart */}
        {(kaarten.length > 0 || regioFilter) && (
          <section id="sol-selectie" className="mt-8 scroll-mt-6">
            <div className="flex items-center gap-2.5 pb-4">
              <Icon.Trending className="h-4 w-4 text-[#2f6df0]" />
              <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">
                Sol&apos;s selectie{regioNaam ? ` · ${regioNaam}` : ""}
              </span>
              {regioFilter && (
                <Link href={`${basePath}#sol-selectie`} className="text-[11px] font-semibold text-[#2f6df0] hover:underline">
                  ✕ alle regio&apos;s
                </Link>
              )}
              <span className="ml-1 h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold tracking-wide text-stone-400">OP MATCH</span>
            </div>
            {kaarten.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {kaarten.map((item) => (
                  <VerhaalKaart key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">Geen nieuws uit {regioNaam} in deze editie.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
