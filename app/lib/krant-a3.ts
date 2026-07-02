// Pure helpers for the A3 "Dagblad + Verhaallijn" krant layout.
// No DB, no React — unit-testable in isolation.

import { REGIO_NAAM } from "../../modules/shared/regios";

/** Returns the 1-based day-of-year for an ISO date string (YYYY-MM-DD).
 *  Uses UTC arithmetic to avoid DST-induced rounding errors. */
export function dayOfYear(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Formats a signed market delta as "+1.23%" or "-0.45%". Zero is treated as positive. */
export function formatMarktDelta(d: number): string {
  return (d >= 0 ? "+" : "") + d.toFixed(2) + "%";
}

export interface RegioBarRow {
  code: string;
  naam: string;
  count: number;
  /** 0–100: width percentage scaled so the max-count row = 100 */
  pct: number;
}

/** Builds sorted bar-chart rows from a regios record. Zero-count entries are omitted. */
export function regioBarData(regios: Record<string, number>): RegioBarRow[] {
  const entries = Object.entries(regios).filter(([, n]) => n > 0);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, n]) => n));
  return entries
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => ({
      code,
      naam: (REGIO_NAAM as Record<string, string>)[code] ?? code,
      count,
      pct: max > 0 ? Math.round((count / max) * 100) : 0,
    }));
}
