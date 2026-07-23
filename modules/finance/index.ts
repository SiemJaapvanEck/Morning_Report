// Personal Finance math core (docs/prd/finance.md, Phase 2). Pure functions
// only — every function here takes plain data and returns plain data, no
// Supabase/React/Next. The caller (a future `/financien` server page) reads
// rows via `modules/shared/db`, fetches live quotes/FX (`modules/markten`),
// and feeds both into these helpers.
//
// FX correctness rail (PRD §5): a missing rate never gets guessed — it
// contributes 0 € and the caller is expected to surface that as a flag.

import type { Expense, FinanceGoal, FinanceQuote, Holding, HoldingBuy, Income } from "../shared/types";

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

// ============================================================
// Monthly income/expense report (Phase 4) — the aggregation behind the
// /financien cashflow report. `monthlySurplus` above is the single-month
// income-minus-expense figure (also the projection's default DCA
// contribution, PRD locked decision); these build the report's per-month
// rows and forward-project using only **recurring** items (locked decision:
// recurring income/expenses auto-repeat forward, everything else does not).
// ============================================================

export interface MonthTotal {
  /** "YYYY-MM" */
  month: string;
  income_eur: number;
  expense_eur: number;
  surplus_eur: number;
}

/**
 * Every month with at least one income or expense entry, ascending, each
 * with its totals and surplus. Purely a grouping of the actual entered
 * data — no recurring-forward projection (see `projectRecurringForward`).
 */
export function monthlyTotals(
  incomes: Pick<Income, "received_on" | "amount_eur">[],
  expenses: Pick<Expense, "spent_on" | "amount_eur">[],
): MonthTotal[] {
  const incomeByMonth = new Map<string, number>();
  for (const i of incomes) {
    const month = i.received_on.slice(0, 7);
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + i.amount_eur);
  }
  const expenseByMonth = new Map<string, number>();
  for (const e of expenses) {
    const month = e.spent_on.slice(0, 7);
    expenseByMonth.set(month, (expenseByMonth.get(month) ?? 0) + e.amount_eur);
  }
  const months = new Set([...incomeByMonth.keys(), ...expenseByMonth.keys()]);
  return [...months].sort().map((month) => {
    const income_eur = incomeByMonth.get(month) ?? 0;
    const expense_eur = expenseByMonth.get(month) ?? 0;
    return { month, income_eur, expense_eur, surplus_eur: income_eur - expense_eur };
  });
}

/**
 * The flat monthly net if every **recurring** income/expense repeats
 * unchanged — the "structural" surplus/deficit, independent of one-off
 * entries. Feeds `projectRecurringForward`; also useful on its own as a
 * report stat.
 */
export function recurringMonthlyNet(
  incomes: Pick<Income, "recurring" | "amount_eur">[],
  expenses: Pick<Expense, "recurring" | "amount_eur">[],
): number {
  const recurringIncome = incomes.filter((i) => i.recurring).reduce((sum, i) => sum + i.amount_eur, 0);
  const recurringExpense = expenses.filter((e) => e.recurring).reduce((sum, e) => sum + e.amount_eur, 0);
  return recurringIncome - recurringExpense;
}

/** "YYYY-MM" shifted forward by `n` months (n >= 0 expected here). */
function addReportMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/**
 * The report's forward-looking rows (locked decision: recurring items
 * auto-repeat forward for the projection): `months` rows after `fromMonth`
 * (exclusive), each carrying the flat recurring income/expense totals —
 * one-off (non-recurring) entries never appear in these future rows, since
 * by definition they don't repeat.
 */
export function projectRecurringForward(
  incomes: Pick<Income, "recurring" | "amount_eur">[],
  expenses: Pick<Expense, "recurring" | "amount_eur">[],
  fromMonth: string,
  months: number,
): MonthTotal[] {
  const recurringIncome = incomes.filter((i) => i.recurring).reduce((sum, i) => sum + i.amount_eur, 0);
  const recurringExpense = expenses.filter((e) => e.recurring).reduce((sum, e) => sum + e.amount_eur, 0);
  const rows: MonthTotal[] = [];
  for (let i = 1; i <= months; i++) {
    rows.push({
      month: addReportMonth(fromMonth, i),
      income_eur: recurringIncome,
      expense_eur: recurringExpense,
      surplus_eur: recurringIncome - recurringExpense,
    });
  }
  return rows;
}

// ============================================================
// Portfolio return (Phase 3, shared with the Phase 6 dashboard tile) — the
// live portfolio value read against total € invested.
// ============================================================

/**
 * % return of the live portfolio value against cost basis. `null` when
 * there's no cost basis yet (`costBasisEur <= 0`, e.g. no buys) — a real
 * "not applicable" reading, never a divide-by-zero or a guessed 0%.
 */
export function rendementPct(currentValueEur: number, costBasisEur: number): number | null {
  return costBasisEur > 0 ? ((currentValueEur - costBasisEur) / costBasisEur) * 100 : null;
}

// ============================================================
// Goal progress (Phase 5) — the investment goal (ETA-driven) + named
// savings goals share one progress-bar reading: current € over target €.
// ============================================================

/**
 * Progress toward a goal as a percentage, clamped to `[0, 100]`: current €
 * over target €. `targetEur <= 0` reads as 0 (never a divide-by-zero or a
 * guessed number) — mirrors the module's "never guess" rail. Overachieving
 * a goal caps the bar at 100 rather than overflowing it.
 */
export function goalProgressPct(currentEur: number, targetEur: number): number {
  if (targetEur <= 0) return 0;
  return Math.min(100, Math.max(0, (currentEur / targetEur) * 100));
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

/**
 * Presentational label for an `etaMonthsToTarget` result: `"~N jaar M mnd"` /
 * `"doel al bereikt"` / `"buiten bereik"` (the `ETA_MONTH_CAP` case).
 * Shared by the Goals section (`FinancienGoals`) and the Phase 6 cover-
 * dashboard ETA tile — one implementation, no drift between the two.
 */
export function etaLabel(months: number | null): string {
  if (months === null) return "buiten bereik";
  if (months === 0) return "doel al bereikt";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years > 0 ? `${years} jaar` : null, rest > 0 ? `${rest} mnd` : null].filter(Boolean);
  return `~${parts.join(" ")}`;
}

// ============================================================
// Cover-dashboard snapshot (Phase 6, docs/prd/finance.md) — the four
// headline tiles (Netto waarde, Deze maand over, Beleggingsdoel ETA,
// Rendement %) reduced to one pure aggregation over the same raw rows /
// live quotes `/financien` reads. No new math: composes
// `portfolioValueEur`/`costBasisSeries`/`monthlySurplus`/`etaMonthsToTarget`/
// `rendementPct` above. The only impure part (DB reads + the live Yahoo
// fetch) lives in `app/lib/financeDashboard.ts`.
// ============================================================

export interface FinanceDashboardBuy {
  holding_id: string;
  bought_on: string;
  quantity: number;
  price_native: number;
  currency: string;
  fee_eur: number;
}

export interface FinanceDashboardInput {
  holdings: Pick<Holding, "id" | "symbol" | "currency">[];
  buys: FinanceDashboardBuy[];
  quotes: Record<string, FinanceQuote>;
  fx: Record<string, number>;
  incomes: Pick<Income, "received_on" | "amount_eur">[];
  expenses: Pick<Expense, "spent_on" | "amount_eur">[];
  investmentGoal: Pick<FinanceGoal, "target_eur"> | null;
  savingsGoals: Pick<FinanceGoal, "saved_eur">[];
  expectedReturnPct: number;
  monthlyContributionEur: number;
  /** "YYYY-MM" — the month `monthlySurplusEur` is computed for (today's month). */
  month: string;
}

export interface FinanceDashboardSnapshot {
  /** live portfolio value + every savings goal's `saved_eur`. */
  netWorthEur: number;
  /** this month's income − expenses (same figure the DCA default reads). */
  monthlySurplusEur: number;
  /** false hides the ETA tile — no investment goal set yet. */
  hasInvestmentGoal: boolean;
  /** meaningful only when `hasInvestmentGoal`; `etaLabel()`-ready. */
  etaMonths: number | null;
  /** false hides the Rendement tile — no buys landed a cost basis yet. */
  hasCostBasis: boolean;
  /** meaningful only when `hasCostBasis`. */
  rendementPct: number | null;
}

/**
 * Aggregates the cover-dashboard finance tiles. `null` when the profile has
 * no finance data at all yet (no holdings, no goals, no cashflow entries) —
 * CijfersCard-style: the caller hides the whole tile row rather than
 * rendering zeros for a profile that never touched `/financien`.
 */
export function summarizeFinanceDashboard(input: FinanceDashboardInput): FinanceDashboardSnapshot | null {
  const {
    holdings,
    buys,
    quotes,
    fx,
    incomes,
    expenses,
    investmentGoal,
    savingsGoals,
    expectedReturnPct,
    monthlyContributionEur,
    month,
  } = input;

  const hasAnyData =
    holdings.length > 0 ||
    savingsGoals.length > 0 ||
    investmentGoal !== null ||
    incomes.length > 0 ||
    expenses.length > 0;
  if (!hasAnyData) return null;

  const portfolioEur = portfolioValueEur(holdings, buys, quotes, fx);
  const savingsEur = savingsGoals.reduce((sum, g) => sum + g.saved_eur, 0);

  const costBasis = costBasisSeries(
    buys.map((buy) => ({
      bought_on: buy.bought_on,
      quantity: buy.quantity,
      price_native: buy.price_native,
      currency: buy.currency,
      fee_eur: buy.fee_eur,
      fx_to_eur: buy.currency === "EUR" ? 1 : fx[buy.currency],
    })),
  );
  const costBasisTotal = costBasis.at(-1)?.cost_basis_eur ?? 0;
  const hasCostBasis = costBasisTotal > 0;

  return {
    netWorthEur: portfolioEur + savingsEur,
    monthlySurplusEur: monthlySurplus(incomes, expenses, month),
    hasInvestmentGoal: investmentGoal !== null,
    etaMonths: investmentGoal
      ? etaMonthsToTarget(portfolioEur, monthlyContributionEur, expectedReturnPct, investmentGoal.target_eur)
      : null,
    hasCostBasis,
    rendementPct: hasCostBasis ? rendementPct(portfolioEur, costBasisTotal) : null,
  };
}
