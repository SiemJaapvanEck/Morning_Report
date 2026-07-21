// Pure presentation helpers for the "Alle verhalen" archive list (Phase B):
// sorting, the day-span of a story, the relative "updated … ago" label, and the
// category → color map. Kept pure (no React) so they're unit-testable.

import type { Story } from "@/app/lib/queries";
import type { DeepArticle, ThreadPrediction, ThreadStatus, TimelineNode } from "@/modules/shared/types";
import { isRegioCode } from "../../modules/shared/regios";

export type StorySort = "latest" | "longest" | "active";

/** How alive a story is, by how recently it last had an event. */
export type Recency = "live" | "week" | "dormant";

const MS_PER_DAY = 86_400_000;

/**
 * Bucket a story by the age of its last event: `live` (≤2 days — this/last
 * edition), `week` (≤7 days), else `dormant`. This is the recency filter axis —
 * sharper than the stored status, which today is always "active".
 */
export function recencyTier(iso: string | null, now: number): Recency {
  if (!iso) return "dormant";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "dormant";
  const days = (now - then) / MS_PER_DAY;
  if (days <= 2) return "live";
  if (days <= 7) return "week";
  return "dormant";
}

/**
 * Header stats for the Verhaallijn rail (brandbook §4): instalments so far,
 * running time in whole weeks (≥1 as soon as there is a dated instalment),
 * and the number of distinct named sources. Pure over the timeline nodes.
 */
export function storylineStats(timeline: TimelineNode[]): {
  parts: number;
  weeks: number;
  sources: number;
} {
  const past = timeline.filter((n) => n.kind === "past");
  const dates = past
    .map((n) => Date.parse(n.date + "T00:00:00Z"))
    .filter((t) => !Number.isNaN(t));
  let weeks = 0;
  if (dates.length > 0) {
    const span = Math.max(...dates) - Math.min(...dates);
    weeks = Math.max(1, Math.round(span / (7 * MS_PER_DAY)));
  }
  const sources = new Set(past.map((n) => n.source).filter((s): s is string => Boolean(s)));
  return { parts: past.length, weeks, sources: sources.size };
}

/** Time span in whole days, first → latest event. 0 when undated. */
export function spanDays(s: { firstDate: string | null; lastDate: string | null }): number {
  if (!s.firstDate || !s.lastDate) return 0;
  const a = Date.parse(s.firstDate + "T00:00:00Z");
  const b = Date.parse(s.lastDate + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

/**
 * Order the stories for one of the three sort tabs.
 * - latest: most recently updated first (then most recent event)
 * - longest: widest first→latest span first
 * - active: most events first
 * Stable, non-mutating; ties fall back to title so the order is deterministic.
 */
export function sortStories(stories: Story[], sort: StorySort): Story[] {
  const byTitle = (a: Story, b: Story) => a.title.localeCompare(b.title);
  const arr = [...stories];
  if (sort === "latest") {
    arr.sort(
      (a, b) =>
        (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "") ||
        (b.lastDate ?? "").localeCompare(a.lastDate ?? "") ||
        byTitle(a, b),
    );
  } else if (sort === "longest") {
    arr.sort((a, b) => spanDays(b) - spanDays(a) || byTitle(a, b));
  } else {
    arr.sort((a, b) => b.eventCount - a.eventCount || byTitle(a, b));
  }
  return arr;
}

/** Compact relative age, e.g. "nu", "5m", "2u", "3d". `now` is ms-since-epoch. */
export function updatedAgo(iso: string | null, now: number): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "nu";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u`;
  return `${Math.floor(hours / 24)}d`;
}

/** Status → the row badge (label + Tailwind classes). active = the LIVE accent. */
export const STATUS_BADGE: Record<ThreadStatus, { label: string; cls: string }> = {
  active: {
    label: "LIVE",
    cls: "border border-rose-400 text-rose-600 dark:border-rose-500/70 dark:text-rose-400",
  },
  dormant: {
    label: "SLAPEND",
    cls: "border border-stone-300 text-stone-400 dark:border-stone-600 dark:text-stone-500",
  },
  closed: {
    label: "AFGEROND",
    cls: "border border-stone-300 text-stone-400 dark:border-stone-600 dark:text-stone-500",
  },
};

// ── Detail page (Phase C): timeline scrubber + intensity ─────────────────────

/** Whole-day index of an ISO date (YYYY-MM-DD), UTC. */
function dayIndex(iso: string): number {
  return Math.floor(Date.parse(iso + "T00:00:00Z") / MS_PER_DAY);
}

/**
 * Horizontal position (0..100%) of each event on the detail-page scrubber, by its
 * date between the first and last event — same mapping as the archive TimelineBar.
 * Input order is preserved; undated/unparseable dates fall back to 0. A single
 * (or zero-span) story puts every node at 0.
 */
export function timelinePositions(dates: string[]): number[] {
  const days = dates.map((d) => (d ? dayIndex(d) : NaN));
  const valid = days.filter((d) => !Number.isNaN(d));
  if (valid.length === 0) return dates.map(() => 0);
  const first = Math.min(...valid);
  const last = Math.max(...valid);
  const span = Math.max(1, last - first);
  return days.map((d) => (Number.isNaN(d) ? 0 : Math.round(((d - first) / span) * 1000) / 10));
}

/**
 * Event density per equal-width time bin across the story's span — the intensity
 * bars under the scrubber. Returns an array of `bins` integer counts (first → last
 * event). Empty/undated input yields all-zero bins.
 */
export function eventHeat(dates: string[], bins: number): number[] {
  const out = new Array(Math.max(1, bins)).fill(0) as number[];
  const days = dates.map((d) => (d ? dayIndex(d) : NaN)).filter((d) => !Number.isNaN(d));
  if (days.length === 0) return out;
  const first = Math.min(...days);
  const last = Math.max(...days);
  const span = last - first;
  for (const d of days) {
    const idx =
      span === 0
        ? out.length - 1
        : Math.min(out.length - 1, Math.floor(((d - first) / (span + 1)) * out.length));
    out[idx]++;
  }
  return out;
}

/**
 * Rank candidate storylines by entity-overlap with the current one, strongest
 * first; drops zero-overlap candidates. Ties break on id so the order is
 * deterministic. The overlap fn is injected so this stays a pure, testable
 * wrapper (callers pass `entityOverlap` from modules/threads).
 */
export function rankRelated<T extends { id: string; entities: string[] }>(
  selfEntities: string[],
  others: T[],
  overlap: (a: string[], b: string[]) => number,
  limit = 4,
): { item: T; score: number }[] {
  return others
    .map((item) => ({ item, score: overlap(selfEntities, item.entities) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit);
}

/** Category slug → dot/timeline color. The #2f6df0 interaction blue is reserved. */
const CATEGORY_COLOR: Record<string, string> = {
  tech: "#7c3aed", // violet
  wereld: "#dc2626", // red
  financieel: "#d97706", // amber
  games: "#db2777", // fuchsia
  wetenschap: "#0891b2", // cyan
  frontier: "#16a34a", // emerald
  lokaal: "#78716c", // stone
};

/** Color for a category slug, with a neutral fallback for unknown/missing. */
export function categoryColor(slug: string | null | undefined): string {
  return (slug && CATEGORY_COLOR[slug]) || "#78716c";
}

/** Title-case a lowercase entity/anchor for display: "nasdaq 100" → "Nasdaq 100". */
export function titleCaseEntity(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Short display subject for a big thread (umbrella). Once a thread is generated,
 * its `title` is often a full sentence ("Anthropic lanceert Claude Science als
 * workflow-tool…") — but the archive wants just the subject. Keep the stored
 * title when it is already short/subject-like (so good forms like "SpaceX" or
 * "PlayStation" survive with their exact casing); otherwise fall back to the
 * title-cased anchor entity, or the leading words when there is no anchor.
 */
export function threadSubject(title: string, anchor: string | null): string {
  const trimmed = title.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 3 && trimmed.length <= 30) return trimmed;
  if (anchor && anchor.trim()) return titleCaseEntity(anchor.trim());
  return words.slice(0, 3).join(" ");
}

// ── Umbrella multi-line timeline (Phase E) ───────────────────────────────────

/**
 * Per-day item counts across an inclusive [start, end] date window (both
 * YYYY-MM-DD) — the y-values for one storyline's line on the umbrella chart.
 * Each in-window event date increments its day bucket; dates outside the window
 * or unparseable are ignored. Returns one integer per day from start to end
 * (length = span + 1). An empty or inverted window yields `[]`.
 */
export function dailyActivitySeries(dates: string[], start: string, end: string): number[] {
  const first = dayIndex(start);
  const last = dayIndex(end);
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return [];
  const out = new Array(last - first + 1).fill(0) as number[];
  for (const d of dates) {
    if (!d) continue;
    const di = dayIndex(d);
    if (Number.isNaN(di) || di < first || di > last) continue;
    out[di - first]++;
  }
  return out;
}

/** One plotted point on a storyline line: x/y in 0..100, plus the raw count. */
export interface LinePoint {
  x: number;
  y: number;
  value: number;
}

/**
 * Map a daily-activity series to chart points in a 0..100 box: x spread evenly
 * across the window (single-day series sits at x 0), y = the day's share of
 * `maxActivity` (busiest day → 100, zero → 0). `maxActivity` ≤ 0 flattens y to 0.
 * Rounded to 0.1 so the emitted SVG path stays compact.
 */
export function seriesPoints(series: number[], maxActivity: number): LinePoint[] {
  const span = Math.max(1, series.length - 1);
  return series.map((value, i) => ({
    x: Math.round((i / span) * 1000) / 10,
    y: maxActivity > 0 ? Math.round((value / maxActivity) * 1000) / 10 : 0,
    value,
  }));
}

/** Stroke width (px) for a storyline line by recency — live lines read heavier. */
export function lineWeight(recency: Recency): number {
  return recency === "live" ? 3 : recency === "week" ? 2 : 1.25;
}

/**
 * Count the distinct extra web sources (Tavily grounding) behind a rubriek's
 * deep articles — the "+N extra bronnen via Tavily" cijfers row. Deduped by URL
 * across every article in the section, so a source cited by two articles counts
 * once. Articles without grounding (the field is optional / absent until Tavily
 * runs live) contribute nothing, so this is 0 whenever grounding is off.
 */
export function tavilyBronCount(items: { article: DeepArticle | null }[]): number {
  const urls = new Set<string>();
  for (const it of items) {
    for (const s of it.article?.groundingSources ?? []) {
      if (s.url) urls.add(s.url);
    }
  }
  return urls.size;
}

// ── Verhaallijn timeline builder (A3 Phase 2) ────────────────────────────────

/** Raw link record from thread_items enriched with edition date + item metadata. */
export interface TimelineLink {
  edition_id: string;
  date: string;
  title: string;
  source: string | null;
  item_id: string;
}

/**
 * Assemble the A3 Verhaallijn timeline from raw links for one thread.
 *
 * One `TimelineNode` per distinct edition on/before `today` (ascending date),
 * the latest marked `isNow`. An optional `future` node from `prediction` is
 * appended at the end. Returns `[]` when `links` is empty.
 *
 * Per-edition dedup: the first link seen for a given `edition_id` wins
 * (callers iterate in whatever order the DB returns; ordering by date is done
 * here from the deduplicated set).
 */
export function buildStorylineTimeline(
  links: TimelineLink[],
  today: string,
  prediction: ThreadPrediction | null,
): TimelineNode[] {
  // Dedup: one entry per edition_id, on/before today
  const seen = new Set<string>();
  const byEdition: { edition_id: string; date: string; title: string; source: string | null }[] = [];
  for (const l of links) {
    if (l.date > today) continue;
    if (seen.has(l.edition_id)) continue;
    seen.add(l.edition_id);
    byEdition.push({ edition_id: l.edition_id, date: l.date, title: l.title, source: l.source });
  }

  if (byEdition.length === 0) return [];

  // Ascending by date so deel numbering is chronological
  byEdition.sort((a, b) => a.date.localeCompare(b.date));

  const nodes: TimelineNode[] = byEdition.map((e, i) => ({
    kind: "past" as const,
    date: e.date,
    title: e.title,
    source: e.source,
    deel: i + 1,
    isNow: false,
  }));

  // Mark the latest past node as "vandaag"
  const lastIdx = nodes.length - 1;
  const last = nodes[lastIdx];
  if (last.kind === "past") {
    nodes[lastIdx] = { ...last, isNow: true };
  }

  // Append future node from prediction
  if (prediction) {
    nodes.push({
      kind: "future",
      date: prediction.target_date,
      text: prediction.text,
      certainty: prediction.confidence,
    });
  }

  return nodes;
}

// ── Impact map geography helper (A3 Phase 3) ─────────────────────────────────

/**
 * Derive a story's geography for the ImpactMapCard:
 * - `counts` maps the item's region code to weight 1 for the map's dot intensity
 *   (null/unknown regio ⇒ empty counts; map falls back to a dark background).
 * - `chips` = de-duped title-cased place-entity canonical names, capped at 6.
 * Empty/null input ⇒ `{counts:{}, chips:[]}` (card hides).
 */
export function storyGeography(
  regio: string | null,
  placeEntities: string[],
): { counts: Record<string, number>; chips: string[] } {
  const counts: Record<string, number> = {};
  if (regio && isRegioCode(regio)) {
    counts[regio] = 1;
  }

  const seen = new Set<string>();
  const chips: string[] = [];
  for (const p of placeEntities) {
    if (!p) continue;
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(titleCaseEntity(p));
    if (chips.length >= 6) break;
  }

  return { counts, chips };
}

