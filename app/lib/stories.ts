// Pure presentation helpers for the "Alle verhalen" archive list (Phase B):
// sorting, the day-span of a story, the relative "updated … ago" label, and the
// category → color map. Kept pure (no React) so they're unit-testable.

import type { Story } from "@/app/lib/queries";
import type { ThreadStatus } from "@/modules/shared/types";

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
