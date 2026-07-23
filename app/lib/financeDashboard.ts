// Cover-dashboard finance snapshot (docs/prd/finance.md, Phase 6). The one
// impure step behind `summarizeFinanceDashboard()` in modules/finance: reads
// the same rows `/financien` reads (getPortfolio/getCashflow/getGoals) plus
// a live quotes/FX fetch (modules/markten), then hands everything to the
// pure aggregator — no new math here, only wiring.
//
// Locked decision (reviewed): callers only ever invoke this for *today*'s
// edition. A historical `/editie/[datum]` never calls it — it renders the
// snapshot as `null` (tile row hidden) instead of fetching or reusing
// today's numbers under a past date's label.

import { getCashflow, getGoals, getPortfolio } from "@/app/lib/queries";
import { fetchFxToEur, fetchQuotes } from "@/modules/markten";
import { monthlySurplus, summarizeFinanceDashboard, type FinanceDashboardSnapshot } from "@/modules/finance";

export async function getFinanceDashboardSnapshot(profileId: string): Promise<FinanceDashboardSnapshot | null> {
  const [{ holdings, buys, settings }, { incomes, expenses }, { investment, savings }] = await Promise.all([
    getPortfolio(profileId),
    getCashflow(profileId),
    getGoals(profileId),
  ]);

  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const currencies = [...new Set(holdings.map((h) => h.currency).filter((c) => c !== "EUR"))];
  const [quotes, fx] = await Promise.all([
    symbols.length > 0 ? fetchQuotes(symbols) : Promise.resolve({}),
    currencies.length > 0 ? fetchFxToEur(currencies) : Promise.resolve({}),
  ]);

  const todayMonth = new Date().toISOString().slice(0, 7);

  // Same DCA-contribution default as /financien (Phase 4 locked decision):
  // the current month's surplus, unless overridden in finance_settings.
  const monthlyContributionEur =
    settings?.monthly_contribution_override ?? monthlySurplus(incomes, expenses, todayMonth);

  return summarizeFinanceDashboard({
    holdings,
    buys,
    quotes,
    fx,
    incomes,
    expenses,
    investmentGoal: investment,
    savingsGoals: savings,
    expectedReturnPct: settings?.expected_return_pct ?? 7,
    monthlyContributionEur,
    month: todayMonth,
  });
}
