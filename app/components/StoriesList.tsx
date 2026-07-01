"use client";

// The archive's headline view (Phase B): every anchor thread as one flat row —
// category dot + tag, a LIVE/SLAPEND status badge, the title, "UPD … geleden",
// and a timeline bar (first → latest event, one dot per event) with the day-span
// + event count on the right. Sort tabs (Laatste / Langste / Actiefste) and a
// category-filter chip row work client-side; a row links to its detail page.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archivo, Space_Mono } from "next/font/google";
import type { Story } from "@/app/lib/queries";
import {
  type StorySort,
  type Recency,
  sortStories,
  spanDays,
  categoryColor,
  STATUS_BADGE,
} from "@/app/lib/stories";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const SORTS: { key: StorySort; label: string }[] = [
  { key: "latest", label: "Laatste" },
  { key: "longest", label: "Langste" },
  { key: "active", label: "Actiefste" },
];

const RECENCY: { key: Recency | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "live", label: "Live" },
  { key: "week", label: "Deze week" },
  { key: "dormant", label: "Sluimerend" },
];

const dayNum = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 86_400_000);
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).toUpperCase();
const fmtYear = (d: string) => new Date(d + "T00:00:00").getFullYear();

/** The fluid timeline bar for one row: a line first→latest with a dot per event. */
function TimelineBar({ story, color }: { story: Story; color: string }) {
  if (!story.firstDate || !story.lastDate || story.events.length === 0) {
    return <div className="h-6" />;
  }
  const first = dayNum(story.firstDate);
  const last = dayNum(story.lastDate);
  const span = Math.max(1, last - first);
  // Dedupe dots that land on the same day so a busy day reads as one marker.
  const pcts = [...new Set(story.events.map((e) => Math.round(((dayNum(e.date) - first) / span) * 1000) / 10))];
  return (
    <div className="relative h-6 w-full">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-stone-200 dark:bg-stone-700" />
      <div
        className="absolute top-1/2 h-px -translate-y-1/2"
        style={{ left: "0%", right: `${100 - (pcts.at(-1) ?? 100)}%`, backgroundColor: color, opacity: 0.6 }}
      />
      {pcts.map((p, i) => {
        const isLast = i === pcts.length - 1;
        return (
          <span
            key={p}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${p}%`,
              width: isLast ? 12 : 8,
              height: isLast ? 12 : 8,
              backgroundColor: isLast ? color : "transparent",
              border: `2px solid ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

export function StoriesList({ stories }: { stories: Story[] }) {
  const [sort, setSort] = useState<StorySort>("latest");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [recency, setRecency] = useState<Recency | "all">("all");
  const [onlyFollowed, setOnlyFollowed] = useState(false);

  const followedCount = useMemo(() => stories.filter((s) => s.followed).length, [stories]);

  // Category chips partition on each story's *dominant* category, so a chip is a
  // sharp bucket again (the full multi-category set stays as display tags only).
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of stories) if (s.category && !seen.has(s.category.slug)) seen.set(s.category.slug, s.category.label);
    return [...seen.entries()].map(([slug, label]) => ({ slug, label }));
  }, [stories]);

  const visible = useMemo(() => {
    const filtered = stories.filter(
      (s) =>
        (recency === "all" || s.recency === recency) &&
        (!activeCat || s.category?.slug === activeCat) &&
        (!onlyFollowed || s.followed),
    );
    return sortStories(filtered, sort);
  }, [stories, recency, activeCat, sort, onlyFollowed]);

  return (
    <div className={`${archivo.variable} ${spaceMono.variable}`}>
      {/* Header + sort tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-archivo)] text-3xl font-extrabold tracking-tight">
            Alle verhalen{" "}
            <span className="font-[family-name:var(--font-space-mono)] text-sm font-normal text-stone-400">
              {stories.length} lopende verhaallijnen
            </span>
          </h1>
          <p className="mt-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
            Balklengte = tijdspanne van eerste → laatste gebeurtenis
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sort === s.key
                  ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recency (live / week / dormant) — a sharp partitioning axis */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60">
          {RECENCY.map((r) => (
            <button
              key={r.key}
              onClick={() => setRecency(r.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                recency === r.key
                  ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {followedCount > 0 && (
          <button
            onClick={() => setOnlyFollowed((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              onlyFollowed
                ? "border-[#2f6df0] bg-[#2f6df0] text-white"
                : "border-stone-200 text-[#2f6df0] hover:bg-[#2f6df0]/5 dark:border-stone-700"
            }`}
          >
            ★ Mijn verhalen
            <span className={onlyFollowed ? "text-white/80" : "text-stone-400"}>{followedCount}</span>
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeCat === null
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "border border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-700"
            }`}
          >
            Alle
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCat(activeCat === c.slug ? null : c.slug)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeCat === c.slug
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "border border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(c.slug) }} />
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
        {visible.map((s) => {
          const color = categoryColor(s.category?.slug);
          const badge = STATUS_BADGE[s.status];
          return (
            <Link
              key={s.id}
              href={`/archive/${s.id}`}
              className="group grid grid-cols-1 gap-4 py-5 transition hover:bg-[#2f6df0]/[0.04] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            >
              {/* Left: meta + title */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider">
                  {(s.categories.length > 0 ? s.categories : [null]).map((c, ci) => (
                    <span key={c?.slug ?? ci} className="inline-flex items-center gap-1.5 text-stone-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: categoryColor(c?.slug) }}
                      />
                      {c?.label ?? "—"}
                    </span>
                  ))}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                  {s.isUmbrella && s.storylineCount > 0 && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#2f6df0] ring-1 ring-inset ring-[#2f6df0]/40">
                      ▨ {s.storylineCount} verhaallijnen
                    </span>
                  )}
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span className="text-stone-400">upd {s.updatedLabel} geleden</span>
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-archivo)] text-xl font-extrabold leading-tight tracking-tight text-stone-900 group-hover:text-[#2f6df0] dark:text-stone-100">
                  {s.title}
                </h2>
              </div>

              {/* Right: timeline bar + span/count */}
              <div className="min-w-0">
                <div className="flex items-center justify-between font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
                  <span>{s.firstDate ? fmtDay(s.firstDate) : ""}</span>
                  <span className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-900 dark:text-stone-100">{spanDays(s)}</strong>d ·{" "}
                    <strong className="text-stone-900 dark:text-stone-100">{s.eventCount}</strong> gebeurtenissen
                  </span>
                </div>
                <div className="mt-2">
                  <TimelineBar story={s} color={color} />
                </div>
                <div className="mt-1 text-right font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
                  {s.lastDate ? `→ ${fmtDay(s.lastDate)} · ${fmtYear(s.lastDate)}` : "nog geen gebeurtenissen"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-stone-700">
          Geen verhaallijnen met deze filters.
        </p>
      )}
    </div>
  );
}
