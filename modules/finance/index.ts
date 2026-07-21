// Personal Finance math core (docs/prd/finance.md, Phase 2). Pure functions
// only — every function here takes plain data and returns plain data, no
// Supabase/React/Next. The caller (a future `/financien` server page) reads
// rows via `modules/shared/db`, fetches live quotes/FX (`modules/markten`),
// and feeds both into these helpers.
//
// FX correctness rail (PRD §5): a missing rate never gets guessed — it
// contributes 0 € and the caller is expected to surface that as a flag.

import type { Expense, FinanceQuote, Holding, HoldingBuy, Income } from "../shared/types";

// ============================================================
// Cost basis (cumulative € invested over time)
// ============================================================

/**
 * One buy, shaped for `costBasisSeries`. Mirrors `HoldingBuy` plus an
 * optional buy-time FX rate (1 unit of `currency` → EUR) the caller passes
 * in for non-EUR buys — this module has no historical-FX lookup of its own
 * (PRD non-goal: no historical-price backfill). EUR buys need no rate.
 */
export interface CostBasisBuy {
  bought_on: string;
  quantity: number;
  price_native: number;
  currency: string;
  fee_eur: number;
  /** 1 unit of `currency` → EUR at buy time. Ignored/unnecessary when currency is 'EUR'. */
  fx_to_eur?: number;
}

export interface CostBasisPoint {
  date: string;
  cost_basis_eur: number;
}

/** € cost (excl. fee) of one buy, converted with its buy-time FX (or 1 for EUR). */
function buyCostEur(buy: CostBasisBuy): number {
  const fx = buy.currency === "EUR" ? 1 : (buy.fx_to_eur ?? 0);
  return buy.price_native * buy.quantity * fx + buy.fee_eur;
}

/**
 * Cumulative € invested over time as a step series: one point per distinct
 * buy date (sorted ascending), each point the running total up to and
 * including that date. A buy whose FX rate is unresolved (non-EUR, no
 * `fx_to_eur`) contributes 0 € for that buy — never a guessed rate.
 */
export function costBasisSeries(buys: CostBasisBuy[]): CostBasisPoint[] {
  const sorted = [...buys].sort((a, b) => a.bought_on.localeCompare(b.bought_on));
  const points: CostBasisPoint[] = [];
  let running = 0;
  for (const buy of sorted) {
    running += buyCostEur(buy);
    const last = points[points.length - 1];
    if (last && last.date === buy.bought_on) {
      last.cost_basis_eur = running;
    } else {
      points.push({ date: buy.bought_on, cost_basis_eur: running });
    }
  }
  return points;
}

// ============================================================
// Quantity held / portfolio valuation
// ============================================================

/** Total quantity bought on or before `date` (ISO "YYYY-MM-DD"). No sells exist in this PRD. */
export function quantityAsOf(buys: Pick<HoldingBuy, "bought_on" | "quantity">[], date: string): number {
  let total = 0;
  for (const buy of buys) {
    if (buy.bought_on <= date) total += buy.quantity;
  }
  return total;
}

/**
 * Today's total € portfolio value: for each holding, live quantity × live
 * price, converted to EUR via `fx`. A holding whose quote or FX rate is
 * missing contributes 0 € (never guessed) — the caller flags it in the UI.
 */
export function portfolioValueEur(
  holdings: Pick<Holding, "id" | "symbol" | "currency">[],
  buys: Pick<HoldingBuy, "holding_id" | "bought_on" | "quantity">[],
  quotes: Record<string, FinanceQuote>,
  fx: Record<string, number>,
): number {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0;
  for (const holding of holdings) {
    const qty = quantityAsOf(
      buys.filter((b) => b.holding_id === holding.id),
      today,
    );
    if (qty === 0) continue;
    const quote = quotes[holding.symbol];
    if (!quote) continue; // koers onbekend — 0 €, nooit gegokt
    const rate = holding.currency === "EUR" ? 1 : fx[holding.currency];
    if (rate === undefined) continue; // FX onbekend — 0 €, nooit gegokt
    total += qty * quote.price * rate;
  }
  return total;
}

// ============================================================
// Cashflow (monthly surplus = the DCA driver)
// ============================================================

/**
 * € income − € expenses for the given month ("YYYY-MM"). Matches entries
 * whose date (`received_on`/`spent_on`) falls in that month. Recurring
 * forward-projection of income/expenses is Phase 4 scope, not this helper.
 */
export function monthlySurplus(incomes: Pick<Income, "received_on" | "amount_eur">[], expenses: Pick<Expense, "spent_on" | "amount_eur">[], month: string): number {
  const inMonth = (iso: string) => iso.startsWith(month);
  const totalIncome = incomes.filter((i) => inMonth(i.received_on)).reduce((sum, i) => sum + i.amount_eur, 0);
  const totalExpense = expenses.filter((e) => inMonth(e.spent_on)).reduce((sum, e) => sum + e.amount_eur, 0);
  return totalIncome - totalExpense;
}

// ============================================================
// Compound projection + goal ETA
// ============================================================

/** Annual return % → equivalent monthly rate, so monthly compounding matches the stated annual return. */
function monthlyRate(annualReturnPct: number): number {
  return Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
}

/**
 * Forward € series under monthly compounding: a constant monthly
 * contribution added *after* each month's growth. `series[0]` is
 * `startValueEur` (today); `series[i]` is the value after `i` months.
 */
export function projectCompound(
  startValueEur: number,
  monthlyContributionEur: number,
  annualReturnPct: number,
  months: number,
): number[] {
  const rate = monthlyRate(annualReturnPct);
  const series: number[] = [startValueEur];
  for (let i = 1; i <= months; i++) {
    series.push(series[i - 1] * (1 + rate) + monthlyContributionEur);
  }
  return series;
}

/** Cap on how far `etaMonthsToTarget` searches before declaring the target unreachable. */
export const ETA_MONTH_CAP = 600;

/**
 * How many whole months (monthly compounding, constant contribution) until
 * the projected value reaches `targetEur`. `0` when the target is already
 * met. `null` when unreachable within `ETA_MONTH_CAP` months (e.g. a
 * shrinking or flat balance that never gets there) — shown as "buiten
 * bereik" in the UI, never a wildly large number.
 */
export function etaMonthsToTarget(
  startValueEur: number,
  monthlyContributionEur: number,
  annualReturnPct: number,
  targetEur: number,
): number | null {
  if (startValueEur >= targetEur) return 0;
  const rate = monthlyRate(annualReturnPct);
  let value = startValueEur;
  for (let month = 1; month <= ETA_MONTH_CAP; month++) {
    value = value * (1 + rate) + monthlyContributionEur;
    if (value >= targetEur) return month;
  }
  return null;
}
