"use client";

// The umbrella hub (Phase E), master–detail. LEFT: a sticky article panel that
// reads the selected storyline in place — its accumulated "Stand van zaken", the
// latest deep article, Sol's note, the events and sources. RIGHT: the storylines
// as a single-column list of selectable blocks (the untangled-spaghetti idea),
// each keeping the tile content — facet eyebrow, headline, event-dot strip,
// LIVE · upd · N delen, follow bell. Selecting a block swaps the article without
// navigating; a block's bell follows just that line. Follow uses the shared
// /api/threads/follow; the umbrella-wide follow lives on the hero.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import type { UmbrellaLine, StorylineEvent } from "@/app/lib/queries";
import { categoryColor } from "@/app/lib/stories";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-space-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const GENERAL_COLOR = "#a8a29e";

const fmtShort = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).toUpperCase();

/** A follow bell: filled accent when followed, outline when not. */
export function FollowBell({ on, pending }: { on: boolean; pending?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={on ? "#2f6df0" : "none"}
      stroke={on ? "#2f6df0" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={pending ? "opacity-50" : ""}
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * The event strip: one pressable dot per event, positioned by date across the
 * storyline's span. Hovering pops the event's title; pressing opens that exact
 * moment in the article panel. Outline = has a deep article, solid fill = selected.
 */
function EventDots({
  events,
  color,
  selectedIndex,
  onPick,
}: {
  events: StorylineEvent[];
  color: string;
  selectedIndex: number | null;
  onPick: (index: number) => void;
}) {
  const dots = useMemo(() => {
    const dated = events
      .map((e, i) => ({ i, e, ms: e.date ? Date.parse(e.date + "T00:00:00Z") : NaN }))
      .filter((x) => !Number.isNaN(x.ms));
    if (dated.length === 0) return [];
    const first = Math.min(...dated.map((x) => x.ms));
    const last = Math.max(...dated.map((x) => x.ms));
    const span = Math.max(1, last - first);
    return dated
      .map((x) => ({
        i: x.i,
        title: x.e.title,
        hasArticle: Boolean(x.e.article),
        pct: Math.round(((x.ms - first) / span) * 1000) / 10,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [events]);

  if (dots.length === 0) return <div className="h-7" />;
  return (
    <div className="relative h-7 w-full">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-stone-200 dark:bg-stone-700" />
      {dots.map((d) => {
        const on = d.i === selectedIndex;
        return (
          <button
            key={d.i}
            onClick={(e) => {
              e.stopPropagation();
              onPick(d.i);
            }}
            aria-label={d.title}
            className="group/dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1"
            style={{ left: `${d.pct}%` }}
          >
            <span
              className="block rounded-full transition-all"
              style={{
                width: on ? 16 : 13,
                height: on ? 16 : 13,
                backgroundColor: on ? color : "transparent",
                border: on || d.hasArticle ? `2px solid ${color}` : `1.5px solid ${color}66`,
                boxShadow: on ? `0 0 0 4px ${color}22` : "none",
              }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-[220px] -translate-x-1/2 whitespace-normal break-words rounded-md bg-stone-900 px-2 py-1 text-center text-[11px] font-medium leading-snug text-white shadow-lg group-hover/dot:block dark:bg-stone-100 dark:text-stone-900">
              {d.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One selectable storyline block in the right-hand list. */
function StorylineBlock({
  line,
  selected,
  selectedEventIndex,
  followed,
  pending,
  onSelect,
  onPickEvent,
  onToggle,
}: {
  line: UmbrellaLine;
  selected: boolean;
  selectedEventIndex: number | null;
  followed: boolean;
  pending: boolean;
  onSelect: () => void;
  onPickEvent: (index: number) => void;
  onToggle: () => void;
}) {
  const color = line.general ? GENERAL_COLOR : categoryColor(line.category?.slug);
  const live = line.recency === "live";
  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border p-4 transition ${
        selected
          ? "border-[#2f6df0] bg-[#2f6df0]/[0.05] ring-1 ring-[#2f6df0]/40"
          : line.general
            ? "border-dashed border-stone-300 bg-stone-50/60 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900/40"
            : "border-stone-200 bg-white hover:border-[#2f6df0]/50 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      {!line.general && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          disabled={pending}
          aria-label={followed ? `Ontvolg ${line.facet}` : `Volg ${line.facet}`}
          title={followed ? "Gevolgd" : "Volg deze verhaallijn"}
          className="absolute right-3 top-3 text-stone-400 transition hover:text-[#2f6df0]"
        >
          <FollowBell on={followed} pending={pending} />
        </button>
      )}

      <div className="flex items-center gap-1.5 pr-7 font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wider text-stone-500">
        <span
          className="h-2.5 w-2.5 flex-none rounded-full"
          style={line.general ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { backgroundColor: color }}
        />
        <span className="truncate">{line.facet}</span>
      </div>

      <h3
        className={`mt-2 font-[family-name:var(--font-archivo)] text-[16px] font-extrabold leading-snug tracking-tight ${
          line.general
            ? "text-stone-500 dark:text-stone-400"
            : selected
              ? "text-[#2f6df0]"
              : "text-stone-900 group-hover:text-[#2f6df0] dark:text-stone-100"
        }`}
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {line.headline}
      </h3>

      <div className="mt-2">
        <EventDots
          events={line.detail.events}
          color={color}
          selectedIndex={selected ? selectedEventIndex : null}
          onPick={onPickEvent}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-stone-400">
        {live && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
            live
          </span>
        )}
        <span>upd {line.updatedLabel}</span>
        <span className="text-stone-300 dark:text-stone-600">·</span>
        <span>
          {line.itemCount} {line.itemCount === 1 ? "deel" : "delen"}
        </span>
      </div>
    </div>
  );
}

/** The left reading panel: the storyline's state + the selected moment's article. */
function ArticlePanel({
  line,
  eventIndex,
  onPickEvent,
}: {
  line: UmbrellaLine;
  eventIndex: number | null;
  onPickEvent: (index: number) => void;
}) {
  const color = line.general ? GENERAL_COLOR : categoryColor(line.category?.slug);
  const d = line.detail;
  // Which moment to read: the pressed dot, else the latest with a deep article.
  const latestIdx = d.events.findIndex((e) => e.article);
  const activeIndex = eventIndex != null ? eventIndex : latestIdx >= 0 ? latestIdx : d.events.length ? 0 : -1;
  const active = activeIndex >= 0 ? d.events[activeIndex] : null;
  const ripples = active?.article?.ripples ?? [];
  const lead = active?.article?.lead ?? "";
  const solNote = active?.solNote ?? d.solNote;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
        <span className="inline-flex items-center gap-1.5 text-stone-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {line.facet}
        </span>
        {line.category && !line.general && (
          <>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span>{line.category.label}</span>
          </>
        )}
        {line.recency === "live" && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
            live
          </span>
        )}
        {d.firstDate && d.lastDate && (
          <>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span>
              {fmtShort(d.firstDate)} → {fmtShort(d.lastDate)}
            </span>
          </>
        )}
      </div>

      <h2 className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-extrabold leading-[1.1] tracking-tight sm:text-[28px]">
        {line.headline}
      </h2>

      {d.state && (
        <div className="mt-4">
          <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Stand van zaken
          </span>
          <div className="mt-2 space-y-2.5 font-[family-name:var(--font-space-grotesk)] text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
            {d.state.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="mt-5 border-t border-stone-200 pt-5 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-stone-400">
            <span className="font-bold text-stone-500">{eventIndex != null ? "Gekozen moment" : "Laatste verdieping"}</span>
            {active.date && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{fmtShort(active.date)}</span>
              </>
            )}
            {active.source && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{active.source}</span>
              </>
            )}
          </div>
          {active.title !== line.headline && (
            <h3 className="mt-2 font-[family-name:var(--font-archivo)] text-lg font-extrabold leading-snug tracking-tight">
              {active.title}
            </h3>
          )}
          {lead ? (
            <>
              <div className="mt-3 space-y-3 font-[family-name:var(--font-space-grotesk)] text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                {lead.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              {ripples.length > 0 && (
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
              )}
            </>
          ) : (
            <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[14px] leading-relaxed text-stone-500">
              Geen uitgewerkte verdieping voor dit moment.
              {active.url && (
                <>
                  {" "}
                  <a href={active.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2f6df0] hover:underline">
                    Lees de bron ↗
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {!d.state && !active && (
        <p className="mt-4 font-[family-name:var(--font-space-grotesk)] text-[15px] text-stone-500">
          Nog geen uitgewerkte verdieping voor deze verhaallijn.
        </p>
      )}

      {solNote && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#2f6df0]/30 bg-[#2f6df0]/5 p-4 dark:border-[#2f6df0]/40 dark:bg-[#2f6df0]/10">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#2f6df0] font-[family-name:var(--font-archivo)] text-xs font-bold text-white">
            S
          </span>
          <p className="font-[family-name:var(--font-space-grotesk)] text-[14px] italic leading-relaxed text-stone-700 dark:text-stone-200">
            {solNote}
          </p>
        </div>
      )}

      {d.events.length > 0 && (
        <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-800">
          <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-500">
            In deze verhaallijn · {d.events.length}
          </span>
          <ul className="mt-2.5 divide-y divide-stone-100 dark:divide-stone-800">
            {d.events.map((e, i) => {
              const on = i === activeIndex;
              return (
                <li key={i}>
                  <button
                    onClick={() => onPickEvent(i)}
                    className={`-mx-2 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[#2f6df0]/[0.05] ${
                      on ? "bg-[#2f6df0]/[0.06]" : ""
                    }`}
                  >
                    <span
                      className={`w-12 flex-none font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase ${
                        on ? "text-[#2f6df0]" : "text-stone-400"
                      }`}
                    >
                      {e.date ? fmtShort(e.date) : "—"}
                    </span>
                    <span
                      className={`flex-1 font-[family-name:var(--font-space-grotesk)] text-[13px] leading-snug ${
                        on ? "text-[#2f6df0]" : "text-stone-700 dark:text-stone-200"
                      }`}
                    >
                      {e.title}
                      {e.source && <span className="ml-1.5 text-stone-400">· {e.source}</span>}
                    </span>
                    {e.article && <span className="mt-0.5 h-1.5 w-1.5 flex-none rounded-full bg-[#2f6df0]" title="verdieping" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {d.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {d.sources.map((s) => (
              <span
                key={s.name}
                className="rounded-md bg-stone-100 px-2 py-1 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              >
                {s.name}
                {s.count > 1 ? ` ×${s.count}` : ""}
              </span>
            ))}
          </div>
        )}
        {!line.general && (
          <Link
            href={`/archive/${line.id}`}
            className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wider text-[#2f6df0] hover:underline"
          >
            Open volledige verhaallijn →
          </Link>
        )}
      </div>
    </div>
  );
}

export function UmbrellaReader({ lines }: { lines: UmbrellaLine[] }) {
  // Default to the busiest real storyline (falls back to the first block).
  const initial = lines.find((l) => !l.general)?.id ?? lines[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initial);
  // Which moment (event) is open in the panel; null = the storyline's latest.
  const [eventIndex, setEventIndex] = useState<number | null>(null);
  const selected = lines.find((l) => l.id === selectedId) ?? lines[0];

  // Selecting a storyline resets to its latest moment; a dot picks a specific one.
  const selectStoryline = (id: string) => {
    setSelectedId(id);
    setEventIndex(null);
  };
  const pickEvent = (id: string, index: number) => {
    setSelectedId(id);
    setEventIndex(index);
  };

  const [follow, setFollow] = useState<Record<string, boolean>>(
    () => Object.fromEntries(lines.map((l) => [l.id, l.followed])),
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function toggleFollow(id: string) {
    const next = !follow[id];
    setFollow((f) => ({ ...f, [id]: next }));
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch("/api/threads/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: id, active: next }),
      });
      if (!res.ok) setFollow((f) => ({ ...f, [id]: !next }));
    } catch {
      setFollow((f) => ({ ...f, [id]: !next }));
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }

  if (!selected) return null;

  return (
    <div className={`${archivo.variable} ${grotesk.variable} ${spaceMono.variable} grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`}>
      {/* LEFT — sticky article panel */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <ArticlePanel
          line={selected}
          eventIndex={selected.id === selectedId ? eventIndex : null}
          onPickEvent={(i) => pickEvent(selected.id, i)}
        />
      </div>

      {/* RIGHT — storyline block list */}
      <div>
        <div className="mb-3 flex items-center justify-between font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wider text-stone-500">
          <span>Verhaallijnen</span>
          <span className="text-stone-400">{lines.filter((l) => !l.general).length} lijnen</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {lines.map((l) => (
            <StorylineBlock
              key={l.id}
              line={l}
              selected={l.id === selectedId}
              selectedEventIndex={eventIndex}
              followed={follow[l.id]}
              pending={!!pending[l.id]}
              onSelect={() => selectStoryline(l.id)}
              onPickEvent={(i) => pickEvent(l.id, i)}
              onToggle={() => toggleFollow(l.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
