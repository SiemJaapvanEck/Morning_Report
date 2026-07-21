// The krant reading page — direction "A2 · Dagblad + Verhaallijn".
// Reference: "Morning Report design/krant-a2-dagblad.html"; recipes and exact
// values: docs/brandbook.md §4. All colors come from the scheme tokens
// (var(--…), see app/lib/schemes.ts) — no hardcoded palette classes here.
//
// Page anatomy: utility bar → masthead band (+ weather bar) → topzone
// (Sol + market/region tiles) → one row per rubriek: articles left,
// sticky map + cijfers middle, sticky Verhaallijn rail right → footer.

import Link from "next/link";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import type { EditionView, SectionView } from "@/app/lib/queries";
import { orderSectionsFollowedFirst } from "@/app/lib/krant";
import { dayOfYear, formatMarktDelta, regioBarData } from "@/app/lib/krant-a3";
import { storyGeography, storylineStats } from "@/app/lib/stories";
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

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

type Item = SectionView["items"][number];

const ARCH = "font-[family-name:var(--font-archivo)]";
const MONO = "font-[family-name:var(--font-space-mono)]";

/** Shell: full-bleed band with the 1680px inner width (brandbook §3). */
const SHELL = "mx-auto max-w-[1680px] px-5 sm:px-10";

function pct(score: number | null): number | null {
  return score != null ? Math.round(score * 100) : null;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
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

// ── Image or hatch (brandbook: never an empty gray box) ────────────────────

function ImageOrHatch({
  imageUrl,
  label,
  heightCls,
  radiusCls,
}: {
  imageUrl: string | null;
  label: string | null;
  heightCls: string;
  radiusCls: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${heightCls} ${radiusCls} w-full object-cover`} />;
  }
  return (
    <div
      className={`${heightCls} ${radiusCls} relative w-full border border-[var(--line)] bg-[repeating-linear-gradient(135deg,var(--hatch),var(--hatch)_13px,var(--paper)_13px,var(--paper)_26px)]`}
      aria-hidden
    >
      {label && (
        <span
          className={`${MONO} absolute bottom-3.5 left-4 rounded-md bg-[var(--paper)] px-2 py-1 text-[11px] tracking-[.04em] text-[var(--faint)]`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ── Utility bar + masthead band ────────────────────────────────────────────

function UtilBar({ date, datumLabel }: { date: string; datumLabel: string }) {
  return (
    <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--util-bg)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-5 py-3.5 sm:px-10">
        <Link
          href={`/editie/${date}`}
          className="group inline-flex items-center gap-2 text-[13.5px] font-semibold"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Overzicht
        </Link>
        <span className={`${ARCH} flex-1 text-center text-[14px] font-extrabold tracking-[.04em]`}>
          MORNING REPORT
        </span>
        <span className={`${MONO} hidden text-[11.5px] tracking-[.06em] text-[var(--muted)] uppercase sm:block`}>
          {datumLabel}
        </span>
      </div>
    </div>
  );
}

function WeerBar({ weather }: { weather: WeatherSnapshot }) {
  const segs: { v: string; k: string }[] = [
    { v: `${Math.round(weather.temp_nu)}°`, k: weather.plaats },
    { v: weather.omschrijving, k: `${Math.round(weather.temp_min)}°/${Math.round(weather.temp_max)}°` },
    { v: `${weather.neerslag_kans}%`, k: "neerslag" },
    { v: `${Math.round(weather.wind_kmh)} km/u`, k: "wind" },
  ];
  return (
    <div className="flex overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]">
      {segs.map((s) => (
        <div key={s.k} className="flex flex-col gap-0.5 border-r border-[var(--line)] px-4 py-2 last:border-r-0">
          <span className={`${ARCH} text-[15px] font-bold`}>{s.v}</span>
          <span className={`${MONO} text-[10px] tracking-[.04em] text-[var(--faint)]`}>{s.k}</span>
        </div>
      ))}
    </div>
  );
}

function Masthead({
  datumLabel,
  nr,
  weather,
}: {
  datumLabel: string;
  nr: number;
  weather: WeatherSnapshot | null;
}) {
  return (
    <header className="border-b-2 border-[var(--ink)]">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-end gap-6 px-5 pt-8 pb-6 sm:px-10">
        <h1 className={`${ARCH} text-[42px] leading-[.85] font-black tracking-[-.04em] sm:text-[64px]`}>
          De Krant
        </h1>
        <div className={`${MONO} text-[12px] leading-[1.7] text-[var(--muted)] tracking-[.04em]`}>
          <b className="text-[var(--ink)] capitalize">{datumLabel}</b>
          <br />
          ochtendeditie · nr. {nr}
        </div>
        <div className="flex-1" />
        {weather && <WeerBar weather={weather} />}
      </div>
    </header>
  );
}

// ── Topzone: Sol + data tiles ──────────────────────────────────────────────

const SOL_GLOW = {
  background: "radial-gradient(120% 90% at 100% 0, rgba(255,255,255,.12), transparent 55%)",
} as const;

function SolBlok({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[var(--accent)] px-6 py-6 text-white sm:px-[34px] sm:py-[30px]">
      <div className="pointer-events-none absolute inset-0" style={SOL_GLOW} />
      <div className={`${MONO} flex items-center gap-3 text-[12px] font-bold tracking-[.16em]`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
          <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 22l-2.5-8.5L3 11l6.5-2.5z" />
        </svg>
        SOL · VANDAAG IN HET KORT
      </div>
      <p className="relative z-[1] mt-[15px] text-[19px] leading-[1.55]">{text}</p>
    </div>
  );
}

function TileHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className={`${MONO} mb-[13px] flex items-center justify-between text-[11px] tracking-[.14em] text-[var(--muted)]`}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function MarktenTile({ indices }: { indices: MarktIndex[] }) {
  if (indices.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-5 py-[18px]">
      <TileHeader left="MARKTEN · INTRADAG" right={`${indices.length} INDICES`} />
      <div className="grid grid-cols-2 gap-x-[22px] gap-y-[9px]">
        {indices.map((idx) => (
          <div key={idx.symbool} className="flex items-center gap-2">
            <span className={`${MONO} flex-1 overflow-hidden text-[12px] text-ellipsis whitespace-nowrap`}>
              {idx.naam}
            </span>
            <span
              className={`${MONO} text-[12.5px] font-bold tabular-nums ${
                idx.d >= 0 ? "text-[var(--emer-t)]" : "text-[var(--rose)]"
              }`}
            >
              {formatMarktDelta(idx.d)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegioTile({ regios }: { regios: Record<string, number> }) {
  const rows = regioBarData(regios);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-5 py-[18px]">
      <TileHeader left="ARTIKELEN PER REGIO" right="VANDAAG" />
      <div>
        {rows.map((row) => (
          <div key={row.code} className="my-1.5 grid grid-cols-[104px_1fr_28px] items-center gap-[9px]">
            <span className={`${MONO} text-[11.5px] whitespace-nowrap text-[var(--muted)]`}>{row.naam}</span>
            <span
              className="h-2 rounded-[4px] bg-[var(--accent)]"
              style={{ width: `${Math.max(8, row.pct)}%` }}
            />
            <span className={`${MONO} text-right text-[11.5px] font-bold`}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section divider + summary ──────────────────────────────────────────────

function SecDivider({ name, caption }: { name: string; caption: string | null }) {
  return (
    <div className="flex items-baseline gap-[18px]">
      <span className={`${ARCH} text-[32px] font-black tracking-[-.03em] sm:text-[42px]`}>{name}</span>
      <span className="h-[2px] flex-1 -translate-y-2 bg-[var(--ink)]" />
      {caption && (
        <span className={`${MONO} hidden -translate-y-1.5 text-[12px] whitespace-nowrap text-[var(--muted)] tracking-[.04em] sm:block`}>
          {caption}
        </span>
      )}
    </div>
  );
}

// ── Article building blocks ────────────────────────────────────────────────

const CERTAINTY_CHIP: Record<CalendarEventCertainty, string> = {
  bevestigd: "text-[var(--emer-t)] bg-[var(--emer-b)]",
  verwacht: "text-[var(--amber-t)] bg-[var(--amber-b)]",
  gerucht: "text-[var(--stone-t)] bg-[var(--stone-b)]",
};

function CertaintyChip({ certainty, small }: { certainty: CalendarEventCertainty; small?: boolean }) {
  return (
    <span
      className={`${MONO} rounded-full font-bold uppercase ${CERTAINTY_CHIP[certainty]} ${
        small ? "px-2 py-[3px] text-[9.5px] tracking-[.08em]" : "px-2.5 py-[5px] text-[10.5px] tracking-[.08em]"
      }`}
    >
      {certainty}
    </span>
  );
}

/** Storyline banner inside the lead (brandbook: thread ribbon). */
function ThreadRibbon({ storyline }: { storyline: NonNullable<Item["storyline"]> }) {
  return (
    <Link
      href="/archive"
      className="mb-[22px] flex items-stretch overflow-hidden rounded-xl border-[1.5px] border-[var(--accent)]"
    >
      <span
        className={`${MONO} flex flex-col items-center justify-center bg-[var(--accent)] px-[15px] py-3 text-[12px] leading-[1.2] font-bold whitespace-nowrap text-white tracking-[.06em]`}
      >
        DEEL
        <b className={`${ARCH} text-[22px] font-black`}>{storyline.part}</b>
      </span>
      <span className="flex flex-col justify-center px-4 py-[11px]">
        <span className={`${MONO} text-[10px] font-bold text-[var(--accent)] tracking-[.16em]`}>VERHAALLIJN</span>
        <span className="mt-[3px] text-[14px] leading-[1.3] font-semibold text-[var(--ink)]">
          {storyline.title}
        </span>
      </span>
    </Link>
  );
}

/** Meta row: source · match% · rating (brandbook: ameta). */
function MetaRow({ item }: { item: Item }) {
  const p = pct(item.match_score);
  return (
    <div className={`${MONO} mb-[22px] flex flex-wrap items-center gap-3.5 text-[12px] text-[var(--muted)]`}>
      {item.source_name && <span className="font-bold text-[var(--ink)]">{item.source_name}</span>}
      {item.source_name && p != null && <span className="h-1 w-1 rounded-full bg-[var(--faint)]" />}
      {p != null && <span>{p}% match</span>}
      <span className="h-1 w-1 rounded-full bg-[var(--faint)]" />
      <span className="inline-flex items-center gap-2">
        <span className={`${MONO} text-[10.5px] text-[var(--faint)] tracking-[.1em]`}>JOUW OORDEEL</span>
        <ItemRating targetType="item" targetId={item.item_id} />
      </span>
    </div>
  );
}

function Ripples({ ripples }: { ripples: { subhead: string; text: string }[] }) {
  if (ripples.length === 0) return null;
  return (
    <div>
      <div className={`${MONO} flex items-center gap-[9px] pt-5 text-[11px] text-[var(--faint)] tracking-[.16em]`}>
        GEVOLGEN · {ripples.length}
      </div>
      <div className="mt-0.5 mb-[26px] border-t border-[var(--line)]">
        {ripples.map((r, i) => (
          <div key={i} className="grid grid-cols-[30px_1fr] gap-4 border-b border-[var(--line)] py-[18px]">
            <span className={`${MONO} pt-[3px] text-[12px] font-bold text-[var(--accent)]`}>
              0{i + 1}
            </span>
            <div>
              <div className={`${ARCH} text-[16px] font-bold tracking-[-.01em]`}>{r.subhead}</div>
              <div className="mt-[5px] text-[14.5px] leading-[1.5] text-[var(--muted)]">{r.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Vooruitblik({ prediction }: { prediction: ThreadPrediction }) {
  return (
    <div className="mb-[26px] overflow-hidden rounded-2xl border-[1.5px] border-[var(--line)] bg-[var(--paper)]">
      <div className="flex items-center gap-2.5 bg-[var(--ink)] px-[18px] py-[13px] text-[var(--paper)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[17px] w-[17px]"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
        <span className={`${MONO} text-[12px] font-bold tracking-[.14em]`}>VOORUITBLIK</span>
        <span className={`${MONO} ml-auto text-[12px] opacity-75`}>{formatShortDate(prediction.target_date)}</span>
      </div>
      <div className="flex items-start gap-3.5 px-[18px] pt-4 pb-[17px]">
        <p className="flex-1 text-[15.5px] leading-[1.46] text-[var(--ink2)]">{prediction.text}</p>
        <CertaintyChip certainty={prediction.confidence} />
      </div>
    </div>
  );
}

/** Body paragraphs; the lead variant gets the drop cap on the first one. */
function ArtikelBody({ text, dropCap }: { text: string; dropCap?: boolean }) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  return (
    <>
      {paras.map((para, i) => (
        <p
          key={i}
          className={`mb-6 text-[18px] leading-[1.62] text-[var(--ink2)] sm:text-[20px] ${
            dropCap && i === 0
              ? "first-letter:float-left first-letter:pt-1.5 first-letter:pr-3.5 first-letter:font-[family-name:var(--font-archivo)] first-letter:text-[78px] first-letter:leading-[.72] first-letter:font-black first-letter:text-[var(--ink)]"
              : ""
          }`}
        >
          {para}
        </p>
      ))}
    </>
  );
}

// ── Lead + featured articles ───────────────────────────────────────────────

function LeadArtikel({ item, sectionTitle }: { item: Item; sectionTitle: string }) {
  const body = item.article?.lead ?? item.summary_text ?? "";
  const p = pct(item.match_score);
  return (
    <section className="mb-4">
      <span className={`${MONO} inline-flex items-center gap-2.5 text-[12px] font-bold text-[var(--accent)] uppercase tracking-[.12em]`}>
        <span className="rounded-md bg-[var(--accent)] px-2 py-[3px] text-white tracking-[.04em]">
          HOOFDVERHAAL{p != null ? ` · ${p}%` : ""}
        </span>
        {sectionTitle}
        {item.source_name ? ` · ${item.source_name}` : ""}
      </span>
      <h2
        className={`${ARCH} mt-4 max-w-[20ch] text-[38px] leading-[1.0] font-extrabold tracking-[-.03em] text-balance sm:text-[58px]`}
      >
        <Titel item={item} cls="" />
      </h2>
      <div className="mt-7">
        <ImageOrHatch
          imageUrl={item.image_url}
          label={item.source_name}
          heightCls="h-[340px] sm:h-[520px]"
          radiusCls="rounded-[18px]"
        />
      </div>
      <div className="mt-[34px]">
        {item.storyline && <ThreadRibbon storyline={item.storyline} />}
        <MetaRow item={item} />
        {body && <ArtikelBody text={body} dropCap />}
        <Ripples ripples={item.article?.ripples ?? []} />
        {item.prediction && <Vooruitblik prediction={item.prediction} />}
      </div>
    </section>
  );
}

function FeaturedArtikel({ item }: { item: Item }) {
  const body = item.article?.lead ?? item.summary_text ?? "";
  return (
    <article className="mt-[34px]">
      <ImageOrHatch
        imageUrl={item.image_url}
        label={item.source_name}
        heightCls="h-[240px] sm:h-[340px]"
        radiusCls="rounded-2xl"
      />
      <h3
        className={`${ARCH} mt-5 max-w-[22ch] text-[27px] leading-[1.04] font-extrabold tracking-[-.02em] text-balance sm:text-[34px]`}
      >
        <Titel item={item} cls="" />
      </h3>
      <div className="mt-[22px]">
        <MetaRow item={item} />
        {body && <ArtikelBody text={body} />}
        <Ripples ripples={item.article?.ripples ?? []} />
        {item.prediction && <Vooruitblik prediction={item.prediction} />}
      </div>
    </article>
  );
}

// ── Summary cards + brief list ─────────────────────────────────────────────

function SummaryCards({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-[34px] grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col bg-[var(--paper)] px-6 py-[22px]">
          <div className="flex items-start justify-between gap-3">
            <h4 className={`${ARCH} text-[18px] leading-[1.18] font-bold tracking-[-.01em]`}>
              <Titel item={item} cls="" />
            </h4>
            <ItemRating targetType="item" targetId={item.item_id} />
          </div>
          {item.summary_text && (
            <p className="mt-[9px] text-[14px] leading-[1.5] text-[var(--muted)]">{item.summary_text}</p>
          )}
          {item.source_name && (
            <p className={`${MONO} mt-auto pt-3.5 text-[11px] text-[var(--faint)] tracking-[.04em]`}>
              {item.source_name}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function BriefLijst({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-[30px] border-t-2 border-[var(--ink)]">
      <div className="flex items-center justify-between pt-3.5 pb-1">
        <span className={`${ARCH} text-[15px] font-extrabold uppercase tracking-[.02em]`}>In het kort</span>
        <span className={`${MONO} text-[11px] text-[var(--faint)]`}>{items.length}</span>
      </div>
      <div className="gap-10 sm:columns-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-baseline gap-3 border-t border-[var(--line2)] py-[11px] break-inside-avoid"
          >
            <span className="h-[5px] w-[5px] shrink-0 -translate-y-0.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[14.5px] leading-[1.35]">
              <Titel item={item} cls="" />
              {item.source_name && (
                <span className={`${MONO} ml-1.5 text-[11px] text-[var(--faint)]`}>{item.source_name}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aside: map card (WAAR HET SPEELT) ──────────────────────────────────────

function AsideBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-[22px]">{children}</div>;
}

function AsideLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em]`}>{children}</p>
  );
}

function MapCard({ regio, places }: { regio: string | null; places: string[] }) {
  const { counts, chips } = storyGeography(regio, places);
  if (Object.keys(counts).length === 0 && chips.length === 0) return null;
  return (
    <AsideBox>
      <AsideLabel>WAAR HET SPEELT</AsideLabel>
      {/* Display-only in the aside: suppress the map's own navigation. */}
      <div className="pointer-events-none mt-3 aspect-[46/22] w-full rounded-[10px] border border-[var(--line2)] bg-[var(--map-bg)] p-[7px]">
        <WereldKaart counts={counts} selectedRegio={regio} tint="blue" />
      </div>
      {chips.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className={`${MONO} rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]`}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </AsideBox>
  );
}

// ── Aside: rubriek in cijfers ──────────────────────────────────────────────

function CijfersCard({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const sources = [...new Set(items.map((i) => i.source_name).filter((s): s is string => Boolean(s)))];
  return (
    <AsideBox>
      <AsideLabel>RUBRIEK IN CIJFERS</AsideLabel>
      <div className="mt-3.5">
        <div className="flex items-baseline gap-[13px] py-[13px] pt-0">
          <b className={`${ARCH} min-w-[52px] text-right text-[30px] leading-[.95] font-black text-[var(--ink)]`}>
            {items.length}
          </b>
          <span className="text-[13.5px] leading-[1.32] text-[var(--muted)]">
            {items.length === 1 ? "artikel" : "artikelen"} in deze rubriek
          </span>
        </div>
        <div className="flex items-baseline gap-[13px] border-t border-[var(--line2)] py-[13px]">
          <b className={`${ARCH} min-w-[52px] text-right text-[30px] leading-[.95] font-black text-[var(--ink)]`}>
            {sources.length}
          </b>
          <span className="text-[13.5px] leading-[1.32] text-[var(--muted)]">
            verschillende bronnen geraadpleegd
          </span>
        </div>
      </div>
      {sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-[15px]">
          <span className={`${MONO} mb-0.5 basis-full text-[9.5px] text-[var(--faint)] uppercase tracking-[.14em]`}>
            Bronnen in deze rubriek
          </span>
          {sources.slice(0, 8).map((src) => (
            <span
              key={src}
              className={`${MONO} rounded-full bg-[var(--stone-b)] px-[9px] py-1 text-[10.5px] font-bold text-[var(--stone-t)]`}
            >
              {src}
            </span>
          ))}
        </div>
      )}
    </AsideBox>
  );
}

// ── Aside: the Verhaallijn rail (the signature element) ────────────────────

function RailNode({ node, isLast }: { node: TimelineNode; isLast: boolean }) {
  const isNow = node.kind === "past" && node.isNow;
  const isFuture = node.kind === "future";
  return (
    <div className={`relative grid grid-cols-[14px_1fr] gap-3.5 ${isLast ? "" : "pb-5"}`}>
      {/* connector line; dashed accent from the "now" node down */}
      {!isLast && (
        <span
          className={`absolute top-[15px] -bottom-0.5 left-[6px] w-[2px] ${
            isNow
              ? "bg-[repeating-linear-gradient(to_bottom,var(--accent)_0_3px,transparent_3px_7px)]"
              : "bg-[var(--line)]"
          }`}
          aria-hidden
        />
      )}
      <span
        className={`z-[1] mt-0.5 h-[13px] w-[13px] rounded-full border-[2.5px] ${
          isNow
            ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-tint)]"
            : isFuture
              ? "border-dashed border-[var(--accent)] bg-[var(--paper)]"
              : "border-[var(--line)] bg-[var(--paper)]"
        }`}
      />
      <div className="min-w-0">
        <div className="mb-[5px] flex flex-wrap items-center gap-[9px]">
          <span
            className={`${MONO} text-[11px] font-bold tracking-[.02em] ${
              isNow || isFuture ? "text-[var(--accent)]" : "text-[var(--ink)]"
            }`}
          >
            {formatShortDate(node.date)}
          </span>
          {node.kind === "past" ? (
            isNow ? (
              <span className={`${MONO} rounded-full bg-[var(--accent)] px-[7px] py-[3px] text-[9px] font-bold text-white uppercase tracking-[.1em]`}>
                VANDAAG
              </span>
            ) : (
              <span className={`${MONO} rounded-full bg-[var(--accent-tint)] px-[7px] py-[3px] text-[9px] font-bold text-[var(--accent)] uppercase tracking-[.1em]`}>
                DEEL {node.deel}
              </span>
            )
          ) : (
            <>
              <span className={`${MONO} rounded-full bg-[var(--emer-b)] px-[7px] py-[3px] text-[9px] font-bold text-[var(--emer-t)] uppercase tracking-[.1em]`}>
                VOORUITBLIK
              </span>
              <CertaintyChip certainty={node.certainty} small />
            </>
          )}
        </div>
        <div
          className={`text-[14px] leading-[1.34] ${
            isNow ? "font-bold text-[var(--ink)]" : "font-medium text-[var(--ink2)]"
          }`}
        >
          {node.kind === "past" ? node.title : node.text}
        </div>
        {node.kind === "past" && node.source && (
          <div className={`${MONO} mt-[5px] text-[10px] text-[var(--faint)] tracking-[.03em]`}>{node.source}</div>
        )}
      </div>
    </div>
  );
}

function VerhaallijnRail({
  sectionTitle,
  storyline,
}: {
  sectionTitle: string;
  storyline: NonNullable<Item["storyline"]>;
}) {
  const stats = storylineStats(storyline.timeline);
  return (
    <div className="overflow-hidden rounded-[18px] border-[1.5px] border-[var(--accent)] bg-[var(--paper)]">
      <div className="relative overflow-hidden bg-[var(--accent)] px-5 pt-[18px] pb-4 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 100% at 100% 0, rgba(255,255,255,.14), transparent 55%)" }}
        />
        <div className={`${MONO} text-[10.5px] font-bold opacity-85 tracking-[.18em]`}>
          VERHAALLIJN · {sectionTitle.toUpperCase()}
        </div>
        <Link href="/archive" className="relative z-[1] block hover:underline">
          <div className={`${ARCH} mt-[9px] text-[21px] leading-[1.12] font-extrabold tracking-[-.01em] text-balance`}>
            {storyline.title}
          </div>
        </Link>
        <div className="relative z-[1] mt-[15px] flex gap-[18px]">
          {[
            { n: stats.parts, k: stats.parts === 1 ? "deel" : "delen" },
            { n: stats.weeks, k: stats.weeks === 1 ? "week" : "weken" },
            { n: stats.sources, k: stats.sources === 1 ? "bron" : "bronnen" },
          ].map((s) => (
            <div key={s.k} className="flex flex-col gap-px">
              <b className={`${ARCH} text-[24px] leading-none font-black`}>{s.n}</b>
              <span className={`${MONO} text-[10px] uppercase opacity-80 tracking-[.08em]`}>{s.k}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pt-5 pb-[22px]">
        {storyline.timeline.map((node, i) => (
          <RailNode key={i} node={node} isLast={i === storyline.timeline.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ── Per-rubriek row ────────────────────────────────────────────────────────

/** The first item with a storyline that has at least one dated instalment. */
function railStory(items: Item[]): Item | null {
  return (
    items.find(
      (i) => i.storyline && i.storyline.timeline.some((n) => n.kind === "past"),
    ) ?? null
  );
}

/** The first item whose geography is non-empty (for the map card). */
function mapStory(items: Item[]): Item | null {
  return (
    items.find((i) => {
      const { counts, chips } = storyGeography(i.regio, i.storyline?.places ?? []);
      return Object.keys(counts).length > 0 || chips.length > 0;
    }) ?? null
  );
}

function KrantRow({
  sectie,
  tekst,
  lead,
  eerste,
}: {
  sectie: SectionView;
  tekst: { caption: string; summary: string } | null;
  lead: Item | null;
  eerste: boolean;
}) {
  const items = sectie.items.filter((i) => i.id !== lead?.id);
  const rowItems = lead ? [lead, ...items] : items;
  if (rowItems.length === 0) return null;

  const featured = items.filter((i) => i.band === "deep");
  const summaries = items.filter((i) => i.band === "summary");
  const briefs = items.filter((i) => i.band === "headline");

  // Priority for the asides: lead first, then deep, then the rest.
  const prioritized = [
    ...(lead ? [lead] : []),
    ...featured,
    ...summaries,
    ...briefs,
  ];
  const rail = railStory(prioritized);
  const geo = mapStory(prioritized);

  return (
    <section
      className={`${SHELL} grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px_360px] xl:gap-11 ${
        eerste ? "mt-[34px]" : "mt-10 border-t-2 border-[var(--ink)] pt-11"
      }`}
    >
      <div className="min-w-0">
        {lead && <LeadArtikel item={lead} sectionTitle={sectie.section.title} />}
        <div className={lead ? "pt-[54px]" : ""}>
          <SecDivider
            name={sectie.section.title}
            caption={`${rowItems.length} ${rowItems.length === 1 ? "artikel" : "artikelen"}`}
          />
          {tekst?.summary && (
            <p className="mt-2.5 max-w-[78ch] text-[16.5px] leading-[1.5] text-[var(--muted)]">{tekst.summary}</p>
          )}
        </div>
        {featured.map((item) => (
          <FeaturedArtikel key={item.id} item={item} />
        ))}
        <SummaryCards items={summaries} />
        <BriefLijst items={briefs} />
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-[90px]">
        {geo && <MapCard regio={geo.regio} places={geo.storyline?.places ?? []} />}
        <CijfersCard items={rowItems} />
      </aside>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-[90px]">
        {rail?.storyline && <VerhaallijnRail sectionTitle={sectie.section.title} storyline={rail.storyline} />}
        {rail?.prediction && !rail.storyline?.timeline.some((n) => n.kind === "future") && (
          <Vooruitblik prediction={rail.prediction} />
        )}
      </aside>
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
  const leadSection = lead
    ? categorySections.find((s) => s.items.some((i) => i.id === lead.id)) ?? null
    : null;
  // The lead's own rubriek opens the paper (the lead leads its section).
  const orderedSections = leadSection
    ? [leadSection, ...categorySections.filter((s) => s !== leadSection)]
    : categorySections;

  const datumLabel = new Date(view.edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
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
    <article
      className={`${archivo.variable} ${grotesk.variable} ${mono.variable} ${grotesk.className} -my-6 mx-[calc(50%-50vw)] bg-[var(--bg)] pb-12 text-[var(--ink)]`}
    >
      <UtilBar date={view.edition.date} datumLabel={datumLabel} />
      <Masthead datumLabel={datumLabel} nr={nr} weather={weather} />

      {hasTopzone && (
        <div className={`${SHELL} mt-[34px] grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_400px]`}>
          {frontPage?.dp_summary ? <SolBlok text={frontPage.dp_summary} /> : <div className="hidden lg:block" />}
          <div className="flex flex-col gap-4">
            <MarktenTile indices={markten} />
            <RegioTile regios={regios} />
          </div>
        </div>
      )}

      {orderedSections.length > 0 ? (
        orderedSections.map((sectie, i) => (
          <KrantRow
            key={sectie.section.id}
            sectie={sectie}
            tekst={sectionText.get(sectie.section.title) ?? null}
            lead={i === 0 ? lead : null}
            eerste={i === 0}
          />
        ))
      ) : (
        <p className={`${SHELL} mt-10 text-[var(--faint)]`}>Deze editie heeft nog geen secties.</p>
      )}

      <footer
        className={`${MONO} mx-auto mt-[50px] max-w-[1680px] border-t border-[var(--line)] px-10 py-10 text-center text-[12px] text-[var(--faint)] tracking-[.06em]`}
      >
        MORNING REPORT · DE KRANT — DAGBLAD + VERHAALLIJN
      </footer>
    </article>
  );
}
