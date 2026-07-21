// Dutch money/percent formatting + parsing for the Personal Finance module
// (docs/prd/finance.md). Pure, framework-agnostic helpers — no Supabase, no
// React. `/financien` and its API routes are the callers (later phases).

/** Formats a euro amount as Dutch currency, e.g. `formatEuro(1234.5)` -> "€ 1.234,50". */
export function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

/**
 * Formats a percentage with a fixed number of decimals (default 1), Dutch
 * decimal comma, e.g. `formatPct(7)` -> "7,0%", `formatPct(-2.345, 2)` -> "-2,35%".
 */
export function formatPct(n: number, decimals = 1): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n / 100);
}

/**
 * Parses a Dutch-formatted amount string into a number: decimal comma,
 * optional thousands separators (dots or spaces), optional leading "€"/
 * whitespace. Returns `null` when the string doesn't parse to a finite
 * number (never throws — callers decide how to handle invalid input).
 *
 * Examples: "1.234,56" -> 1234.56, "€ 12,5" -> 12.5, "42" -> 42, "" -> null.
 */
export function parseAmount(str: string): number | null {
  const trimmed = str.trim().replace(/^€\s*/, "");
  if (trimmed === "") return null;

  // Strip thousands separators (dots or spaces between digit groups), then
  // convert the decimal comma to a dot for Number() to parse.
  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
