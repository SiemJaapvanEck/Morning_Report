"use client";

// The single-storyline detail page (Phase C). A sticky timeline scrubber with an
// intensity strip sits on top; clicking a moment swaps the full deep article below
// it without navigating. A fixed context rail (forecast · agenda · related · sources)
// holds the thread-wide picture. Style matches the home/archive: Archivo headings,
// Space Mono labels, stone palette, #2f6df0 accent, light + dark.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archivo, Space_Mono } from "next/font/google";
import type { StoryDetail } from "@/app/lib/queries";
import type { CalendarEventCertainty } from "@/modules/shared/types";
import {
  categoryColor,
  STATUS_BADGE,
  spanDays,
  timelinePositions,
  eventHeat,
} from "@/app/lib/stories";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const HEAT_BINS = 16;

const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const fmtShort = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).toUpperCase();

const CERTAINTY_LABEL: Record<CalendarEventCertainty, string> = {
  bevestigd: "bevestigd",
  verwacht: "verwacht",
  gerucht: "gerucht",
};
const CERTAINTY_CHIP: Record<CalendarEventCertainty, string> = {
  bevestigd: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  verwacht: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  gerucht: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
};

export function StoryDetailView({ story }: { story: StoryDetail }) {
  const color = categoryColor(story.category?.slug);
  const badge = STATUS_BADGE[story.status];

  // The scrubber reads chronologically (oldest → newest); events arrive newest-first.
  const chrono = useMemo(() => [...story.events].reverse(), [story.events]);
  const positions = useMemo(() => timelinePositions(chrono.map((e) => e.date ?? "")), [chrono]);
  const heat = useMemo(() => eventHeat(chrono.map((e) => e.date ?? ""), HEAT_BINS), [chrono]);
  const maxHeat = Math.max(1, ...heat);

  const [sel, setSel] = useState(Math.max(0, chrono.length - 1));
  const event = chrono[sel];

  const [following, setFollowing] = useState(story.followed);
  const [pending, setPending] = useState(false);
  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const res = await fetch("/api/threads/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: story.id, active: next }),
      });
      if (!res.ok) setFollowing(!next);
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  const lead = event?.article?.lead ?? event?.body ?? "";
  const ripples = event?.article?.ripples ?? [];

  return (
    <div className={`${archivo.variable} ${spaceMono.variable}`}>
      <Link
        href="/archive"
        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Alle verhalen
      </Link>

      {/* Header */}
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider">
            {(story.categories.length > 0 ? story.categories : [null]).map((c, ci) => (
              <span key={c?.slug ?? ci} className="inline-flex items-center gap-1.5 text-stone-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(c?.slug) }} />
                {c?.label ?? "—"}
              </span>
            ))}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span className="text-stone-400">deel {story.eventCount}</span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-archivo)] text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            {story.title}
          </h1>
          <p className="mt-2 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
            {spanDays(story)} dagen · {story.eventCount} gebeurtenissen
            {story.firstDate && story.lastDate ? ` · ${fmtShort(story.firstDate)} → ${fmtShort(story.lastDate)}` : ""}
          </p>
        </div>
        <button
          onClick={toggleFollow}
          disabled={pending}
          className={`flex-none rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            following
              ? "border border-[#2f6df0] text-[#2f6df0] hover:bg-[#2f6df0]/5"
              : "bg-[#2f6df0] text-white hover:bg-[#2558c8]"
          }`}
        >
          {following ? "✓ Gevolgd" : "+ Volg verhaallijn"}
        </button>
      </header>

      {/* Sticky timeline scrubber + intensity */}
      <div className="sticky top-0 z-10 -mx-4 mt-5 bg-stone-50/90 px-4 py-2 backdrop-blur dark:bg-stone-950/90 sm:-mx-6 sm:px-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Tijdlijn — klik een moment
            </span>
            <span className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wider text-stone-400">
              {event?.date ? fmtShort(event.date) : "—"}
            </span>
          </div>

          <div className="relative mx-1 h-7">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-stone-200 dark:bg-stone-700" />
            <div
              className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded"
              style={{ left: 0, right: `${100 - (positions[sel] ?? 100)}%`, backgroundColor: color, opacity: 0.55 }}
            />
            {chrono.map((e, i) => {
              const on = i === sel;
              return (
                <button
                  key={i}
                  onClick={() => setSel(i)}
                  title={e.date ? fmtDay(e.date) : "—"}
                  aria-label={e.title}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition"
                  style={{
                    left: `${positions[i]}%`,
                    width: on ? 16 : 11,
                    height: on ? 16 : 11,
                    backgroundColor: on ? color : "transparent",
                    border: `2px solid ${color}`,
                    boxShadow: on ? "0 0 0 4px rgba(47,109,240,0.14)" : "none",
                  }}
                />
              );
            })}
          </div>

          <div className="mt-2 flex items-end gap-[3px]" style={{ height: 24 }} aria-hidden="true">
            <span className="mr-1 self-center font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wider text-stone-400">
              intensiteit
            </span>
            {heat.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-stone-300 dark:bg-stone-700"
                style={{ height: `${Math.round((v / maxHeat) * 100)}%`, minHeight: 3 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Article + rail */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Selected event's deep article */}
        <article className="min-w-0">
          {event ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
                {event.date && <span>{fmtDay(event.date)}</span>}
                {event.source_name && (
                  <>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <span>{event.source_name}</span>
                  </>
                )}
              </div>
              <h2 className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-extrabold leading-[1.1] tracking-tight sm:text-[28px]">
                {event.title}
              </h2>
              {lead && (
                <div className="mt-4 max-w-3xl space-y-3 text-[15.5px] leading-relaxed text-stone-700 dark:text-stone-300">
                  {lead.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              {ripples.length > 0 && (
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
              )}
              {event.sol_note && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#2f6df0]/30 bg-[#2f6df0]/5 p-4 dark:border-[#2f6df0]/40 dark:bg-[#2f6df0]/10">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#2f6df0] font-[family-name:var(--font-archivo)] text-xs font-bold text-white">
                    S
                  </span>
                  <p className="text-[14px] italic leading-relaxed text-stone-700 dark:text-stone-200">{event.sol_note}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">Nog geen gebeurtenissen aan deze verhaallijn gekoppeld.</p>
          )}
        </article>

        {/* Context rail */}
        <aside className="flex min-w-0 flex-col gap-4">
          {story.prediction && (
            <div className="rounded-2xl border border-[#2f6df0]/30 bg-[#2f6df0]/5 p-4 dark:border-[#2f6df0]/40 dark:bg-[#2f6df0]/10">
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-[#2f6df0]">
                Voorspelling
              </span>
              <p className="mt-2 text-[14px] leading-relaxed text-stone-700 dark:text-stone-200">{story.prediction.text}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 font-[family-name:var(--font-space-mono)] text-[10px] uppercase">
                <span className="rounded bg-[#2f6df0]/10 px-1.5 py-0.5 font-bold text-[#2f6df0]">
                  → {fmtShort(story.prediction.target_date)}
                </span>
                <span className={`rounded px-1.5 py-0.5 font-bold ${CERTAINTY_CHIP[story.prediction.confidence]}`}>
                  {CERTAINTY_LABEL[story.prediction.confidence]}
                </span>
              </div>
              {story.prediction.source_basis && (
                <p className="mt-2.5 border-t border-[#2f6df0]/20 pt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  <span className="font-[family-name:var(--font-space-mono)] text-[9px] font-bold uppercase tracking-wider">
                    grond:{" "}
                  </span>
                  {story.prediction.source_basis}
                </p>
              )}
            </div>
          )}

          {story.agenda.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Agenda
              </span>
              <ul className="mt-2.5 divide-y divide-stone-100 dark:divide-stone-800">
                {story.agenda.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 py-2 first:pt-0">
                    <span className="w-10 flex-none font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase text-[#2f6df0]">
                      {fmtShort(a.date)}
                    </span>
                    <span className="flex-1 text-[13px] leading-snug text-stone-700 dark:text-stone-200">
                      {a.title}{" "}
                      <span
                        className={`ml-0.5 rounded px-1 py-0.5 font-[family-name:var(--font-space-mono)] text-[9px] uppercase ${CERTAINTY_CHIP[a.certainty]}`}
                      >
                        {CERTAINTY_LABEL[a.certainty]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {story.related.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Gerelateerde verhaallijnen
              </span>
              <div className="mt-2">
                {story.related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/archive/${r.id}`}
                    className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-[#2f6df0]/[0.05]"
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ backgroundColor: categoryColor(r.category?.slug) }}
                    />
                    <span className="flex-1 text-[13px] font-medium leading-snug text-stone-800 dark:text-stone-100">
                      {r.title}
                    </span>
                    {r.shared.length > 0 && (
                      <span className="flex-none font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wider text-stone-400">
                        deelt: {r.shared.join(", ")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {story.sources.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Bronnen · {story.sources.length}
              </span>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                {story.sources.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-md bg-stone-100 px-2 py-1 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {s.name}
                    {s.count > 1 ? ` ×${s.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
