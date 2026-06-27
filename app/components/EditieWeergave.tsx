// De volledige krant van één editie als sectie-krant (Phase A): masthead →
// Sol's dag-synthese → hoofdverhaal → secties (titel + caption + samenvatting +
// een diepte-mix: featured deep-artikelen, samenvattingen, korte koppen).
// Vol-breed. Bereikbaar via de "Lees de krant"-knop op het dag-dashboard.

import { Archivo, Space_Mono } from "next/font/google";
import type { EditionView, SectionView } from "@/app/lib/queries";
import type { FrontPage, WeatherSnapshot } from "@/modules/shared/types";
import { ItemRating } from "./ItemRating";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

type Item = SectionView["items"][number];

function pct(score: number | null): number | null {
  return score != null ? Math.round(score * 100) : null;
}

function titel(item: Item, cls: string) {
  return item.url ? (
    <a href={item.url} target="_blank" rel="noreferrer" className={`${cls} hover:underline`}>
      {item.title}
    </a>
  ) : (
    <span className={cls}>{item.title}</span>
  );
}

function WeerStrook({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
      <span className="text-lg font-bold text-stone-800 dark:text-stone-100">{Math.round(weather.temp_nu)}°</span>
      <span>{weather.omschrijving}</span>
      <span>
        {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}° · {weather.neerslag_kans}% neerslag ·{" "}
        {Math.round(weather.wind_kmh)} km/u
      </span>
      <span className="ml-auto text-stone-400">{weather.plaats}</span>
    </div>
  );
}

// Sol's dag-synthese: de blauwe "vandaag in het kort"-strook bovenaan de krant.
function SolSynthese({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl bg-[#2f6df0] p-6 text-white sm:p-7">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#2f6df0]">
          S
        </span>
        <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-[0.15em]">
          Sol · vandaag in het kort
        </span>
      </div>
      <p className="mt-3 max-w-4xl text-[16px] leading-relaxed">{text}</p>
    </div>
  );
}

// De doorwerking: ≤3 gelabelde gevolgen onder een diep artikel.
function Ripples({ ripples }: { ripples: { subhead: string; text: string }[] }) {
  if (ripples.length === 0) return null;
  return (
    <div className="mt-5 grid gap-5 border-t border-stone-200 pt-5 dark:border-stone-800 sm:grid-cols-2">
      {ripples.map((r, i) => (
        <div key={i}>
          <h4 className="font-[family-name:var(--font-archivo)] text-[15px] font-extrabold leading-snug tracking-tight">
            {r.subhead}
          </h4>
          <p className="mt-1.5 text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">{r.text}</p>
        </div>
      ))}
    </div>
  );
}

// Het hoofdverhaal: het sterkst passende diepe artikel van de dag, prominent.
function LeadArtikel({ item }: { item: Item }) {
  const lead = item.article?.lead ?? item.summary_text ?? "";
  const ripples = item.article?.ripples ?? [];
  const p = pct(item.match_score);
  return (
    <section className="mt-6 border-b border-stone-200 pb-8 dark:border-stone-800">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#2f6df0] px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-white">
          Hoofdverhaal
        </span>
        {p != null && <span className="text-[11px] font-bold text-stone-400">{p}% match</span>}
      </div>
      <h2 className="font-[family-name:var(--font-archivo)] text-[30px] font-extrabold leading-[1.06] tracking-tight sm:text-[34px]">
        {titel(item, "")}
      </h2>
      {lead && (
        <div className="mt-4 max-w-4xl space-y-3 text-[15.5px] leading-relaxed text-stone-700 dark:text-stone-300">
          {lead.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      <Ripples ripples={ripples} />
      <div className="mt-5 flex items-center justify-between gap-3">
        {item.source_name && (
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">{item.source_name}</span>
        )}
        <ItemRating targetType="item" targetId={item.item_id} />
      </div>
    </section>
  );
}

// Een featured diep artikel binnen een sectie (lead + doorwerking, compacter).
function FeaturedArtikel({ item }: { item: Item }) {
  const lead = item.article?.lead ?? item.summary_text ?? "";
  const ripples = item.article?.ripples ?? [];
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-[family-name:var(--font-archivo)] text-[18px] font-extrabold leading-snug tracking-tight">
          {titel(item, "")}
        </h4>
        <ItemRating targetType="item" targetId={item.item_id} />
      </div>
      {lead && (
        <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
          {lead.split(/\n\n+/).slice(0, 3).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      <Ripples ripples={ripples} />
      {item.source_name && (
        <p className="mt-3 font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">{item.source_name}</p>
      )}
    </article>
  );
}

// Een samenvattend artikel (band "summary"): kop + korte tekst.
function SummaryKaart({ item }: { item: Item }) {
  return (
    <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-[family-name:var(--font-archivo)] text-[15px] font-bold leading-snug tracking-tight">
          {titel(item, "")}
        </h4>
        <ItemRating targetType="item" targetId={item.item_id} />
      </div>
      {item.summary_text && (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-600 dark:text-stone-300">{item.summary_text}</p>
      )}
      {item.source_name && (
        <p className="mt-1 font-[family-name:var(--font-space-mono)] text-[10.5px] text-stone-400">{item.source_name}</p>
      )}
    </div>
  );
}

// De korte koppen (band "headline") als zijbalk "ook in het nieuws".
function BriefLijst({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50">
      <p className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-400">
        Ook in het nieuws
      </p>
      <ul className="mt-3 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="border-b border-stone-200 py-2.5 last:border-0 dark:border-stone-800">
            <h5 className="font-[family-name:var(--font-archivo)] text-[14px] font-bold leading-snug tracking-tight">
              {titel(item, "")}
            </h5>
            {item.source_name && (
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-stone-400">{item.source_name}</span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Eén krantensectie: titel + Sol's caption + samenvatting + diepte-mix.
function SectieBlok({
  sectie,
  tekst,
  leadId,
}: {
  sectie: SectionView;
  tekst: { caption: string; summary: string } | null;
  leadId: string | null;
}) {
  const items = sectie.items.filter((i) => i.id !== leadId);
  if (items.length === 0) return null;
  const featured = items.filter((i) => i.band === "deep");
  const summaries = items.filter((i) => i.band === "summary");
  const briefs = items.filter((i) => i.band === "headline");
  return (
    <section className="border-t border-stone-200 py-7 dark:border-stone-800">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-archivo)] text-[21px] font-extrabold tracking-tight">
          {sectie.section.title}
        </h3>
        <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold text-stone-400">
          {items.length} artikelen
        </span>
      </div>
      {tekst?.caption && (
        <p className="mt-2 border-l-2 border-[#2f6df0] pl-3 text-[15px] font-semibold leading-snug text-stone-800 dark:text-stone-100">
          {tekst.caption}
        </p>
      )}
      {tekst?.summary && (
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-stone-500 dark:text-stone-400">{tekst.summary}</p>
      )}
      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {featured.map((item) => (
            <FeaturedArtikel key={item.id} item={item} />
          ))}
          {summaries.length > 0 && (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {summaries.map((item) => (
                <SummaryKaart key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
        <BriefLijst items={briefs} />
      </div>
    </section>
  );
}

export function EditieWeergave({ view }: { view: EditionView }) {
  const frontPage = view.edition.front_page as FrontPage | null;
  const weather = view.sections.find((s) => s.section.kind === "weather")?.weather ?? null;
  const sectionText = new Map(
    (frontPage?.dp_sections ?? []).map((s) => [s.title, { caption: s.caption, summary: s.summary }] as const),
  );
  const categorySections = view.sections.filter((s) => s.section.kind === "category" && s.items.length > 0);

  // Het hoofdverhaal: het sterkst passende diepe artikel over alle secties heen.
  const deepItems = categorySections.flatMap((s) => s.items.filter((i) => i.band === "deep"));
  const lead = deepItems.length
    ? [...deepItems].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))[0]
    : null;

  const datum = new Date(view.edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className={`${archivo.variable} ${spaceMono.variable}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-stone-900 pb-2 dark:border-stone-100">
        <h1 className="font-[family-name:var(--font-archivo)] text-[26px] font-extrabold tracking-tight">Morning Report</h1>
        <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-widest text-stone-500">
          <span className="capitalize">{datum}</span> · ochtendeditie
        </span>
      </header>

      {weather && <WeerStrook weather={weather} />}

      {frontPage?.dp_summary && <SolSynthese text={frontPage.dp_summary} />}

      {lead && <LeadArtikel item={lead} />}

      {categorySections.length > 0 ? (
        <div>
          {categorySections.map((sectie) => (
            <SectieBlok
              key={sectie.section.id}
              sectie={sectie}
              tekst={sectionText.get(sectie.section.title) ?? null}
              leadId={lead?.id ?? null}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-stone-400">Deze editie heeft nog geen secties.</p>
      )}
    </article>
  );
}
