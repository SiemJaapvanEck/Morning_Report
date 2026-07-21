// Pure chart-timeline helpers for the Personal Finance portfolio chart
// (docs/prd/finance.md, Phase 3). No React, no Supabase — kept unit-testable.
// The heavy lifting (cost basis / valuation / projection math) lives in
// modules/finance; this file only aligns those series onto one shared
// monthly x-axis and turns them into drawable line segments, reusing
// `seriesPoints()` from ./stories for the index→0..100 mapping (same helper
// the krant umbrella chart uses).

import { seriesPoints, type LinePoint } from "./stories";
import type { CostBasisPoint } from "../../modules/finance";

/** "YYYY-MM-DD" -> "YYYY-MM". */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** "YYYY-MM" shifted by `n` months (may be negative). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Whole months between two "YYYY-MM" keys (b - a). */
export function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** One shared monthly x-axis carrying the three portfolio-chart series. */
export interface PortfolioChartData {
  /** "YYYY-MM" per index, chronological, first-buy month → last projected month. */
  months: string[];
  /** index of "today" in `months`. */
  todayIndex: number;
  /** cumulative € invested, carried forward month to month; null after today (no series beyond "now"). */
  costBasis: (number | null)[];
  /** non-null only at `todayIndex` — the anchored "today" marker (locked decision: no historical backfill). */
  currentValue: (number | null)[];
  /** forward compound projection from today; null before `todayIndex`. */
  projection: (number | null)[];
}

/**
 * Aligns cost-basis history (first buy → today), the anchored current-value
 * "today" point, and the forward projection onto one monthly timeline.
 * `projectionSeries[0]` is expected to be today's value (as returned by
 * `projectCompound`), so it overlaps `currentValueEur` at `todayIndex`.
 * An empty `costBasisSeries` still yields a valid (single-month-anchored)
 * timeline so the projection/today marker can render on their own.
 */
export function buildPortfolioChart(
  costBasisSeries: CostBasisPoint[],
  currentValueEur: number,
  projectionSeries: number[],
  todayIso: string,
): PortfolioChartData {
  const todayMonth = monthKey(todayIso);
  const firstBuyMonth = costBasisSeries[0] ? monthKey(costBasisSeries[0].date) : todayMonth;
  const forwardMonths = Math.max(0, projectionSeries.length - 1);
  const lastMonth = addMonths(todayMonth, forwardMonths);

  const span = Math.max(0, monthsBetween(firstBuyMonth, lastMonth));
  const months = Array.from({ length: span + 1 }, (_, i) => addMonths(firstBuyMonth, i));
  const todayIndex = monthsBetween(firstBuyMonth, todayMonth);

  const costBasis: (number | null)[] = months.map((m, i) => {
    if (i > todayIndex) return null;
    let value: number | null = null;
    for (const p of costBasisSeries) {
      if (monthKey(p.date) <= m) value = p.cost_basis_eur;
    }
    return value;
  });

  const currentValue: (number | null)[] = months.map((_, i) => (i === todayIndex ? currentValueEur : null));

  const projection: (number | null)[] = months.map((_, i) => {
    const offset = i - todayIndex;
    if (offset < 0 || offset >= projectionSeries.length) return null;
    return projectionSeries[offset];
  });

  return { months, todayIndex, costBasis, currentValue, projection };
}

/**
 * Splits a sparse (nullable) value series into one or more contiguous
 * `LinePoint[]` runs — one `<polyline>` per run, so gaps (null) never draw a
 * spurious line back to 0. x/y come from `seriesPoints()` (x depends only on
 * index/length, unaffected by the 0-substitution used for null positions).
 */
export function toSegments(values: (number | null)[], maxValue: number): LinePoint[][] {
  const padded = values.map((v) => v ?? 0);
  const points = seriesPoints(padded, maxValue);
  const segments: LinePoint[][] = [];
  let current: LinePoint[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(points[i]);
    }
  });
  if (current.length) segments.push(current);
  return segments;
}
