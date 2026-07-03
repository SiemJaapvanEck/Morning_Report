// A3 "Dagblad + Verhaallijn" krant layout (Phase 1).
// Replaces the Phase A sectioned-paper layout wholesale.
// Aside slots are reserved per lead/featured story — P2 (timeline) and
// P3 (impact map) will slot in without touching the surrounding structure.

import Link from "next/link";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import type { EditionView, SectionView } from "@/app/lib/queries";
import { orderSectionsFollowedFirst } from "@/app/lib/krant";
import { dayOfYear, formatMarktDelta, regioBarData } from "@/app/lib/krant-a3";
import { storyGeography } from "@/app/lib/stories";
import type {
  CalendarEventCertainty,
  FrontPage,
  MarktIndex,
  ThreadPrediction,
  TimelineNode,
  WeatherSnapshot,
} from "@/modules/shared/types";
import { ItemRating } from "./ItemRating";
import { WereldKaart } from "./WereldKaart";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

type Item = SectionView["items"][number];

const HATCH_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(120,113,108,0.13) 4px, rgba(120,113,108,0.13) 5px)",
} as const;

function pct(score: number | null): number | null {
  return score != null ? Math.round(score * 100) : null;
}

function Titel({ item, cls }: { item: Item; cls: string }) {
  return item.url ? (
    <a href={item.url} target="_blank" rel="noreferrer" className={`${cls} hover:underline`}>
      {item.title}
    </a>
  ) : (
    <span className={cls}>{item.title}</span>
  );
}

// ── Image or hatch banner ──────────────────────────────────────────────────

function ImageBanner({ imageUrl, tall }: { imageUrl: string | null; tall?: boolean }) {
  const h = tall ? "h-48" : "h-36";
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${h} w-full object-cover`} />;
  }
  return <div className={`${h} w-full bg-stone-100 dark:bg-stone-800`} style={HATCH_STYLE} aria-hidden />;
}

// ── Masthead weather strip ─────────────────────────────────────────────────

function WeerStrook({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
      <span className="font-[family-name:var(--font-archivo)] text-lg font-bold text-stone-800 dark:text-stone-100">
        {Math.round(weather.temp_nu)}°
      </span>
      <span>{weather.omschrijving}</span>
      <span>
        {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}° · {weather.neerslag_kans}% neerslag ·{" "}
        {Math.round(weather.wind_kmh)} km/u
      </span>
      <span className="ml-auto text-stone-400">{weather.plaats}</span>
    </div>
  );
}

// ── Topzone tiles ──────────────────────────────────────────────────────────

function SolSynthese({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#2f6df0] p-6 text-white sm:p-7">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#2f6df0]">
          S
        </span>
        <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-[0.15em]">
          Sol · vandaag in het kort
        </span>
      </div>
      <p className="mt-3 max-w-4xl font-[family-name:var(--font-space-grotesk)] text-[16px] leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function MarktenTile({ indices }: { indices: MarktIndex[] }) {
  if (indices.length === 0) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-400">
        Markten · intradag
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {indices.map((idx) => (
          <li key={idx.symbool} className="flex items-baseline justify-between gap-2">
            <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] text-stone-700 dark:text-stone-200">
              {idx.naam}
            </span>
            <span
              className={`font-[family-name:var(--font-space-mono)] text-[12px] font-bold tabular-nums ${
                idx.d >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatMarktDelta(idx.d)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegioTile({ regios }: { regios: Record<string, number> }) {
  const rows = regioBarData(regios);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-400">
        Artikelen per regio
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.code}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-space-grotesk)] text-[12px] text-stone-700 dark:text-stone-200">
                {row.naam}
              </span>
              <span className="font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">
                {row.count}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div className="h-full rounded-full bg-[#2f6df0]" style={{ width: `${row.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Storyline aside (P1 slot; P2 + P3 inject here) ────────────────────────

function VerhaallijnLabel({ storyline }: { storyline: NonNullable<Item["storyline"]> }) {
  return (
    <Link
      href="/archive"
      className="inline-flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-[#2f6df0] hover:underline"
    >
      <span>Verhaallijn</span>
      <span className="text-stone-400">·</span>
      <span className="normal-case tracking-normal">{storyline.title}</span>
      <span className="text-stone-400">·</span>
      <span>deel {storyline.part}</span>
    </Link>
  );
}

const CERTAINTY_LABEL: Record<CalendarEventCertainty, string> = {
  bevestigd: "bevestigd",
  verwacht: "verwacht",
  gerucht: "gerucht",
};
const CERTAINTY_CHIP: Record<CalendarEventCertainty, string> = {
  bevestigd: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  verwacht: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  gerucht: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

function Vooruitblik({ prediction }: { prediction: ThreadPrediction }) {
  const datum = new Date(prediction.target_date + "T00:00:00").toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="mt-3 rounded-2xl border border-[#2f6df0]/30 bg-[#2f6df0]/5 p-4 dark:border-[#2f6df0]/40 dark:bg-[#2f6df0]/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-[#2f6df0]">
          Vooruitblik
        </span>
        <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-stone-400">→ {datum}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-[family-name:var(--font-space-mono)] text-[9.5px] font-bold uppercase ${CERTAINTY_CHIP[prediction.confidence]}`}
        >
          {CERTAINTY_LABEL[prediction.confidence]}
        </span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[14px] leading-relaxed text-stone-700 dark:text-stone-200">
        {prediction.text}
      </p>
    </div>
  );
}

// ── Verhaallijn timeline card (P2) ────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

type PastNode = Extract<TimelineNode, { kind: "past" }>;
type FutureNode = Extract<TimelineNode, { kind: "future" }>;

function TimelineCard({ storyline }: { storyline: NonNullable<Item["storyline"]> }) {
  const pastNodes = storyline.timeline.filter((n): n is PastNode => n.kind === "past");
  const futureNode = storyline.timeline.find((n): n is FutureNode => n.kind === "future");

  return (
    <div>
      <Link
        href="/archive"
        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-[#2f6df0] hover:underline"
      >
        <span>Verhaallijn</span>
        <span className="text-stone-400">·</span>
        <span className="normal-case tracking-normal">{storyline.title}</span>
      </Link>
      <div className="relative mt-3 pl-4">
        {/* Vertical connector line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-200 dark:bg-stone-700" />

        {/* Past nodes */}
        {pastNodes.map((node) => (
          <div key={`${node.date}-${node.deel}`} className="relative mb-3 flex items-start gap-3">
            <div
              className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                node.isNow
                  ? "border-[#2f6df0] bg-[#2f6df0]"
                  : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900"
              }`}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span
                  className={`font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide ${
                    node.isNow ? "text-[#2f6df0]" : "text-stone-400"
                  }`}
                >
                  {node.isNow ? "vandaag" : formatShortDate(node.date)}
                </span>
                <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-stone-400">
                  deel {node.deel}
                </span>
              </div>
              <p
                className={`mt-0.5 font-[family-name:var(--font-space-grotesk)] text-[12.5px] leading-snug ${
                  node.isNow
                    ? "font-semibold text-stone-800 dark:text-stone-100"
                    : "text-stone-600 dark:text-stone-300"
                }`}
              >
                {node.title}
              </p>
              {node.source && (
                <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-stone-400">
                  {node.source}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Future node (prediction) */}
        {futureNode && (
          <div className="relative flex items-start gap-3">
            <div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-dashed border-stone-300 dark:border-stone-600" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold text-stone-400">
                  {formatShortDate(futureNode.date)}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[9px] font-bold uppercase ${CERTAINTY_CHIP[futureNode.certainty]}`}
                >
                  {CERTAINTY_LABEL[futureNode.certainty]}
                </span>
              </div>
              <p className="mt-0.5 font-[family-name:var(--font-space-grotesk)] text-[12.5px] leading-snug text-stone-500 dark:text-stone-400">
                {futureNode.text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Impact map card (P3) ──────────────────────────────────────────────────────

function ImpactMapCard({ regio, places }: { regio: string | null; places: string[] }) {
  const { counts, chips } = storyGeography(regio, places);
  if (Object.keys(counts).length === 0 && chips.length === 0) return null;

  return (
    <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
      <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-400">
        Waar het speelt
      </span>
      {/* pointer-events-none: map is purely informational in the aside context */}
      <div className="mt-2 h-20 w-full pointer-events-none">
        <WereldKaart counts={counts} selectedRegio={regio} tint="blue" />
      </div>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-stone-200 bg-white px-2 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// The aside slot for P2/P3. Shows the full TimelineCard when the storyline has
// ≥2 past instalments; falls back to VerhaallijnLabel + Vooruitblik otherwise.
// Returns null when a story has no storyline or prediction (grid collapses cleanly).
function VerhaallijnAside({ item }: { item: Item }) {
  if (!item.storyline && !item.prediction) return null;
  const pastCount = item.storyline?.timeline.filter((n) => n.kind === "past").length ?? 0;
  const showTimeline = pastCount >= 2;

  return (
    <aside className="mt-5 space-y-1 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50 lg:mt-0">
      {showTimeline && item.storyline ? (
        <TimelineCard storyline={item.storyline} />
      ) : (
        <>
          {item.storyline && <VerhaallijnLabel storyline={item.storyline} />}
          {item.prediction && <Vooruitblik prediction={item.prediction} />}
        </>
      )}
      <ImpactMapCard regio={item.regio} places={item.storyline?.places ?? []} />
    </aside>
  );
}

// ── Article cards ──────────────────────────────────────────────────────────

function Ripples({ ripples }: { ripples: { subhead: string; text: string }[] }) {
  if (ripples.length === 0) return null;
  return (
    <div className="mt-5 grid gap-5 border-t border-stone-200 pt-5 dark:border-stone-800 sm:grid-cols-2">
      {ripples.map((r, i) => (
        <div key={i}>
          <h4 className="font-[family-name:var(--font-archivo)] text-[15px] font-extrabold leading-snug tracking-tight">
            {r.subhead}
          </h4>
          <p className="mt-1.5 font-[family-name:var(--font-space-grotesk)] text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
            {r.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function LeadArtikel({ item }: { item: Item }) {
  const lead = item.article?.lead ?? item.summary_text ?? "";
  const ripples = item.article?.ripples ?? [];
  const p = pct(item.match_score);
  const hasAside = Boolean(item.storyline || item.prediction);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
      <ImageBanner imageUrl={item.image_url} tall />
      <div className={`p-5 sm:p-6 ${hasAside ? "lg:grid lg:grid-cols-[1fr_260px] lg:gap-6" : ""}`}>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2f6df0] px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-white">
              Hoofdverhaal
            </span>
            {p != null && (
              <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold text-stone-400">
                {p}% match
              </span>
            )}
          </div>
          <h2 className="font-[family-name:var(--font-archivo)] text-[30px] font-extrabold leading-[1.06] tracking-tight sm:text-[34px]">
            <Titel item={item} cls="" />
          </h2>
          {lead && (
            <div className="mt-4 max-w-prose space-y-3 font-[family-name:var(--font-space-grotesk)] text-[15.5px] leading-relaxed text-stone-700 dark:text-stone-300">
              {lead.split(/\n\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
          <Ripples ripples={ripples} />
          <div className="mt-5 flex items-center justify-between gap-3">
            {item.source_name && (
              <span className="font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">
                {item.source_name}
              </span>
            )}
            <ItemRating targetType="item" targetId={item.item_id} />
          </div>
        </div>
        <VerhaallijnAside item={item} />
      </div>
    </section>
  );
}

function FeaturedArtikel({ item }: { item: Item }) {
  const lead = item.article?.lead ?? item.summary_text ?? "";
  const ripples = item.article?.ripples ?? [];
  const hasAside = Boolean(item.storyline || item.prediction);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <ImageBanner imageUrl={item.image_url} />
      <div className={`p-5 ${hasAside ? "lg:grid lg:grid-cols-[1fr_220px] lg:gap-5" : ""}`}>
        <div>
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-[family-name:var(--font-archivo)] text-[18px] font-extrabold leading-snug tracking-tight">
              <Titel item={item} cls="" />
            </h4>
            <ItemRating targetType="item" targetId={item.item_id} />
          </div>
          {lead && (
            <div className="mt-2 space-y-2 font-[family-name:var(--font-space-grotesk)] text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
              {lead.split(/\n\n+/).slice(0, 3).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
          <Ripples ripples={ripples} />
          {item.source_name && (
            <p className="mt-3 font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">
              {item.source_name}
            </p>
          )}
        </div>
        <VerhaallijnAside item={item} />
      </div>
    </article>
  );
}

function SummaryKaart({ item }: { item: Item }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-[family-name:var(--font-archivo)] text-[15px] font-bold leading-snug tracking-tight">
          <Titel item={item} cls="" />
        </h4>
        <ItemRating targetType="item" targetId={item.item_id} />
      </div>
      {item.summary_text && (
        <p className="mt-1.5 font-[family-name:var(--font-space-grotesk)] text-[13.5px] leading-relaxed text-stone-600 dark:text-stone-300">
          {item.summary_text}
        </p>
      )}
      {item.source_name && (
        <p className="mt-1 font-[family-name:var(--font-space-mono)] text-[10.5px] text-stone-400">
          {item.source_name}
        </p>
      )}
    </div>
  );
}

function BriefLijst({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50">
      <p className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-400">
        Ook in het nieuws
      </p>
      <ul className="mt-3 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="border-b border-stone-200 py-2.5 last:border-0 dark:border-stone-800">
            <h5 className="font-[family-name:var(--font-archivo)] text-[14px] font-bold leading-snug tracking-tight">
              <Titel item={item} cls="" />
            </h5>
            {item.source_name && (
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-stone-400">
                {item.source_name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Section block ──────────────────────────────────────────────────────────

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
        <p className="mt-2 max-w-3xl font-[family-name:var(--font-space-grotesk)] text-[13.5px] leading-relaxed text-stone-500 dark:text-stone-400">
          {tekst.summary}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-6">
        {featured.map((item) => (
          <FeaturedArtikel key={item.id} item={item} />
        ))}
        {summaries.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {summaries.map((item) => (
              <SummaryKaart key={item.id} item={item} />
            ))}
          </div>
        )}
        <BriefLijst items={briefs} />
      </div>
    </section>
  );
}

// ── Page root ──────────────────────────────────────────────────────────────

export function EditieWeergave({ view }: { view: EditionView }) {
  const frontPage = view.edition.front_page as FrontPage | null;
  const weather = view.sections.find((s) => s.section.kind === "weather")?.weather ?? null;
  const sectionText = new Map(
    (frontPage?.dp_sections ?? []).map((s) => [s.title, { caption: s.caption, summary: s.summary }] as const),
  );
  const categorySections = orderSectionsFollowedFirst(
    view.sections.filter((s) => s.section.kind === "category" && s.items.length > 0),
    view.followedCategoryIds,
  );
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
  const nr = dayOfYear(view.edition.date);
  const markten = frontPage?.markten?.indices ?? [];
  const regios = frontPage?.regios ?? {};
  const hasTopzone = Boolean(frontPage?.dp_summary) || markten.length > 0 || Object.keys(regios).length > 0;

  return (
    <article className={`${archivo.variable} ${grotesk.variable} ${mono.variable}`}>
      {/* MASTHEAD BAND */}
      <header className="border-b-2 border-stone-900 pb-3 dark:border-stone-100">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-[family-name:var(--font-archivo)] text-[26px] font-extrabold tracking-tight">
            Morning Report
          </h1>
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold text-stone-400">
            nr.&nbsp;{nr}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-widest text-stone-500">
            <span className="capitalize">{datum}</span>
          </span>
          <span className="font-[family-name:var(--font-space-mono)] text-[11px] text-stone-400">
            ochtendeditie
          </span>
        </div>
        {weather && <WeerStrook weather={weather} />}
      </header>

      {/* TOPZONE: Sol block + Markten tile + Regio tile */}
      {hasTopzone && (
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
          {frontPage?.dp_summary && (
            <div className="flex-1">
              <SolSynthese text={frontPage.dp_summary} />
            </div>
          )}
          {(markten.length > 0 || Object.keys(regios).length > 0) && (
            <div className="flex shrink-0 flex-col gap-3 lg:w-[200px]">
              {markten.length > 0 && <MarktenTile indices={markten} />}
              {Object.keys(regios).length > 0 && <RegioTile regios={regios} />}
            </div>
          )}
        </div>
      )}

      {/* LEAD ARTIKEL */}
      {lead && <LeadArtikel item={lead} />}

      {/* PER-SECTIE KAARTEN */}
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
        <p className="mt-10 font-[family-name:var(--font-space-grotesk)] text-stone-400">
          Deze editie heeft nog geen secties.
        </p>
      )}
    </article>
  );
}
