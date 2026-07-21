// Financiën — the private personal-finance page (docs/prd/finance.md,
// Phase 3 + 4). Guard shape copied from app/archive/page.tsx. Server-fetches
// holdings/buys (Phase 1 storage) + live quotes/FX (Phase 2, keyless Yahoo,
// no persistence) and hands everything to the client components that render
// the chart and own the CRUD forms. Never rendered in the shareable report —
// this page only exists behind the profile cookie (PRD §2 non-goal).

import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getCashflow, getPortfolio } from "@/app/lib/queries";
import { fetchFxToEur, fetchQuotes } from "../../modules/markten";
import { monthlySurplus } from "../../modules/finance";
import { FinancienPortfolio } from "@/app/components/FinancienPortfolio";
import { FinancienCashflow } from "@/app/components/FinancienCashflow";

export const dynamic = "force-dynamic";

export default async function FinancienPagina() {
  if (!hasDbConfig()) {
    return <p className="text-sm text-stone-500">Supabase is nog niet gekoppeld — zie docs/setup.md.</p>;
  }

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return (
      <p className="text-sm text-stone-500">
        Kies eerst een profiel op de <Link href="/" className="underline">voorpagina</Link>.
      </p>
    );
  }

  const [{ holdings, buys, settings }, { incomes, expenses }] = await Promise.all([
    getPortfolio(profileId),
    getCashflow(profileId),
  ]);

  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const currencies = [...new Set(holdings.map((h) => h.currency).filter((c) => c !== "EUR"))];
  const [quotes, fx] = await Promise.all([
    symbols.length > 0 ? fetchQuotes(symbols) : Promise.resolve({}),
    currencies.length > 0 ? fetchFxToEur(currencies) : Promise.resolve({}),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMonth = todayIso.slice(0, 7);

  // DCA contribution default (Phase 4 locked decision): the current month's
  // surplus, unless the profile has set a manual override in finance_settings
  // (the nullable column exists precisely for the future Settings Financiën
  // tab — PRD amendment). Either way it stays overridable in the UI (P3 chart
  // contribution input).
  const defaultMonthlyContributionEur =
    settings?.monthly_contribution_override ?? monthlySurplus(incomes, expenses, todayMonth);

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Terug naar het dashboard
      </Link>

      <h1 className="mt-4 mb-5 text-2xl font-bold text-[var(--ink)]">Financiën</h1>

      <FinancienPortfolio
        initialHoldings={holdings}
        initialBuys={buys}
        quotes={quotes}
        fx={fx}
        expectedReturnPct={settings?.expected_return_pct ?? 7}
        defaultMonthlyContributionEur={defaultMonthlyContributionEur}
        todayIso={todayIso}
      />

      <FinancienCashflow initialIncomes={incomes} initialExpenses={expenses} />
    </div>
  );
}
