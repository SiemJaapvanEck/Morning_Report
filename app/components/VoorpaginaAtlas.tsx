// Voorpagina in de "Atlas"-stijl (zie Morning Report design/atlas-daily.jsx):
// een bold bento-dashboard met de blauwe Daily Briefing-hero, een weerstrook,
// twee data-tegels rechts en een grid met de beste verhalen. De finance- en
// wereldkaart-tegels uit het ontwerp draaiden op verzonnen data; die zijn hier
// vervangen door eerlijke equivalenten op échte data: "Waar Sol vandaag las"
// (bronnen) en "Sol's selectie" (items op match-score).

import Link from "next/link";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import type { Edition } from "@/modules/shared/types";
import type { EditionView, SectionView } from "@/app/lib/queries";
import { ItemRating } from "./ItemRating";

// Lettertypen van het ontwerp — alleen op de voorpagina via de variabel-classes.
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
  Clock: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  Arrow: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
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

// ── recente edities als puntenrij (tik = die dag openen) ─────────────────────
function EditieDots({ editions, today }: { editions: Edition[]; today: string }) {
  const reeks = [...editions].reverse().slice(-8);
  if (reeks.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {reeks.map((e) => {
        const isVandaag = e.date === today;
        return (
          <Link
            key={e.id}
            href={`/editie/${e.date}`}
            title={fmtDatum(e.date, { weekday: "long", day: "numeric", month: "long" })}
            aria-label={`Editie van ${fmtDatum(e.date, { weekday: "long", day: "numeric", month: "long" })}`}
            className={
              isVandaag
                ? "h-2.5 w-2.5 rounded-full bg-[#2f6df0] ring-2 ring-[#2f6df0]/25"
                : "h-2 w-2 rounded-full bg-stone-300 transition-colors hover:bg-[#2f6df0]/60 dark:bg-stone-700"
            }
          />
        );
      })}
    </div>
  );
}

// ── de blauwe Daily Briefing-hero ────────────────────────────────────────────
function BriefingHero({
  view,
  today,
  headline,
  bullets,
  stats,
}: {
  view: EditionView | null;
  today: string;
  headline: string;
  bullets: KaartItem[];
  stats: { artikelen: number; secties: number; bronnen: number };
}) {
  const intro = view?.edition.front_page?.intro ?? null;
  const datumKort = fmtDatum(today, { day: "numeric", month: "short" }).toUpperCase();

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
            MEEST INTERESSANT VANDAAG
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

      {view && (
        <div className="mt-6">
          <Link
            href={`/editie/${today}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-[family-name:var(--font-archivo)] text-[13px] font-extrabold text-[#2f6df0] transition-transform hover:-translate-y-0.5"
          >
            Lees de krant <Icon.Arrow className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── lege-hero (nog geen editie) ──────────────────────────────────────────────
function LegeHero({ today }: { today: string }) {
  const datum = fmtDatum(today, { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex flex-1 flex-col justify-center rounded-2xl bg-[#2f6df0] p-8 text-white">
      <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wide opacity-85">{datum}</span>
      <h1 className="mt-3 font-[family-name:var(--font-archivo)] text-[30px] font-extrabold tracking-tight">
        Nog geen editie vandaag
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed opacity-90">
        De pipeline draait &apos;s ochtends tussen 06:30 en 08:15. Zodra Sol klaar is,
        verschijnt hier de briefing van vandaag.
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
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold tracking-widest text-stone-400">VANDAAG</span>
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

// ── "Waar Sol vandaag las" — top bronnen als balken (eerlijke variant op de
//    wereldkaart uit het ontwerp) ─────────────────────────────────────────────
function BronnenTegel({ bronnen }: { bronnen: { naam: string; n: number }[] }) {
  const max = Math.max(1, ...bronnen.map((b) => b.n));
  return (
    <div className={`${TILE} flex flex-col p-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon.Globe className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Waar Sol vandaag las</span>
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
        <p className="text-sm text-stone-400">nog geen bronnen vandaag</p>
      )}
    </div>
  );
}

// ── "Sol's selectie" — top items op match-score (variant op "hottest topics") ─
function SelectieTegel({ items }: { items: KaartItem[] }) {
  return (
    <div className={`${TILE} flex flex-1 flex-col p-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon.Trending className="h-4 w-4 text-[#2f6df0]" />
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Sol&apos;s selectie</span>
        <span className="flex-1" />
        <span className="font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold tracking-widest text-stone-400">OP MATCH</span>
      </div>
      <ol className="flex flex-col">
        {items.map((it, i) => {
          const pct = it.match_score != null ? Math.round(it.match_score * 100) : null;
          return (
            <li key={it.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50">
              <span className="w-4 shrink-0 font-[family-name:var(--font-space-mono)] text-[13px] font-bold text-stone-400">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold leading-snug">
                  {it.url ? (
                    <a href={it.url} target="_blank" rel="noreferrer" className="hover:underline">{it.title}</a>
                  ) : (
                    it.title
                  )}
                </span>
                <span className="mt-0.5 block font-[family-name:var(--font-space-mono)] text-[10.5px] text-stone-400">{it.categorie}</span>
              </span>
              {pct != null && (
                <span className="shrink-0 rounded-full bg-[#2f6df0]/10 px-2 py-0.5 font-[family-name:var(--font-archivo)] text-[11px] font-extrabold text-[#2f6df0]">
                  {pct}%
                </span>
              )}
            </li>
          );
        })}
      </ol>
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

// ── hoofdcomponent ───────────────────────────────────────────────────────────
export function VoorpaginaAtlas({
  view,
  editions,
  today,
  profileName,
}: {
  view: EditionView | null;
  editions: Edition[];
  today: string;
  profileName?: string;
}) {
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

  // top bronnen op aantal items
  const bronTel = new Map<string, number>();
  for (const it of allItems) if (it.source_name) bronTel.set(it.source_name, (bronTel.get(it.source_name) ?? 0) + 1);
  const topBronnen = [...bronTel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([naam, n]) => ({ naam, n }));

  const headline = ranked[0]?.title ?? "Je ochtendeditie staat klaar";
  const bullets = ranked.slice(1, 6); // kop is al de #1 — niet herhalen
  const selectie = ranked.slice(0, 6);
  const kaarten = ranked.slice(0, 6);

  const datumLang = fmtDatum(today, { weekday: "long", day: "numeric", month: "long" });
  const initialen = (profileName ?? "Lezer").trim().slice(0, 2).toUpperCase();

  return (
    // volle breedte binnen de smalle layout-container (full-bleed)
    <div
      className={`${grotesk.variable} ${archivo.variable} ${spaceMono.variable} font-[family-name:var(--font-grotesk)]`}
      style={{ marginInline: "calc(50% - 50vw)" }}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* datumstrook met recente edities + avatar */}
        <div className="flex items-center gap-3 pb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2f6df0]" />
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-widest text-stone-500">
            {datumLang}
          </span>
          <span className="flex-1" />
          <EditieDots editions={editions} today={today} />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f6df0] text-[12px] font-bold text-white">
            {initialen}
          </span>
        </div>

        {/* bento */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* linkerkolom: hero + weer */}
          <div className="flex flex-col gap-3 lg:col-span-7">
            {view ? (
              <BriefingHero view={view} today={today} headline={headline} bullets={bullets} stats={stats} />
            ) : (
              <LegeHero today={today} />
            )}
            <WeerStrook weather={weather} />
          </div>

          {/* rechterkolom: bronnen + selectie */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <BronnenTegel bronnen={topBronnen} />
            {selectie.length > 0 && <SelectieTegel items={selectie} />}
          </div>
        </div>

        {/* beste verhalen van vandaag */}
        {kaarten.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-2.5 pb-4">
              <Icon.Trending className="h-4 w-4 text-[#2f6df0]" />
              <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold tracking-tight">Beste verhalen vandaag</span>
              <span className="ml-1 h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold tracking-wide text-stone-400">OP MATCH</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kaarten.map((item) => (
                <VerhaalKaart key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
