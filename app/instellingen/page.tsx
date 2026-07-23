// Instellingen: tabbed shell — Account · Financiën · Pipeline-rapport.
// Account hosts the pre-existing preferences content (onderwerp toevoegen,
// interesses/VoorkeurenKiezer, bronnen, developer-paneel), unchanged.
// Pipeline-rapport mounts today's edition report + trends (MOR-16, Phase 2 —
// see getPipelineReport() in app/lib/queries.ts). Financiën (MOR-17, Phase 3)
// fetches the same portfolio/cashflow/goals + live quotes/FX shape as
// /financien and mounts InstellingenFinancienTab, which in turn mounts the
// unchanged FinancienGoals/FinancienHoldingForm components.
// See docs/prd/settings-tabs.md (Phases 1-3).
//
// "Mijn onderzoek" (Research Tracking PRD, Phase 4 — MOR-13) is mounted below
// as a temporary section, deliberately OUTSIDE InstellingenTabs and without
// touching InstellingenAccountTab.tsx — folding it into the Account tab is
// MOR-18's job (Settings P4), which depends on this component existing.

import Link from "next/link";
import { cookies } from "next/headers";
import { db, hasDbConfig, unwrap } from "@/modules/shared/db";
import { getVoorkeurenData } from "@/app/lib/voorkeuren";
import { getCashflow, getGoals, getPipelineReport, getPortfolio, getResearch } from "@/app/lib/queries";
import { fetchFxToEur, fetchQuotes } from "@/modules/markten";
import { etaMonthsToTarget, monthlySurplus, portfolioValueEur } from "@/modules/finance";
import { InstellingenTabs } from "@/app/components/InstellingenTabs";
import { InstellingenAccountTab } from "@/app/components/InstellingenAccountTab";
import { InstellingenFinancienTab } from "@/app/components/InstellingenFinancienTab";
import { InstellingenPipelineTab } from "@/app/components/InstellingenPipelineTab";
import { MijnOnderzoek } from "@/app/components/MijnOnderzoek";
import type { Source } from "@/modules/shared/types";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
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

  const sources: Source[] = unwrap(await db().from("sources").select("*").order("name"));
  const voorkeuren = await getVoorkeurenData(profileId);
  const { categories, topics } = voorkeuren;
  const pipelineReport = await getPipelineReport(profileId);
  const research = await getResearch(profileId);

  // Financiën tab (MOR-17): same data shape as /financien — holdings/buys +
  // live quotes/FX, cashflow, goals — so the mounted FinancienGoals/
  // FinancienHoldingForm components and the headline stats read the exact
  // same numbers the full page would show.
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
  const expectedReturnPct = settings?.expected_return_pct ?? 7;
  const monthlyContributionEur = settings?.monthly_contribution_override ?? monthlySurplus(incomes, expenses, todayMonth);
  const currentPortfolioValueEur = portfolioValueEur(holdings, buys, quotes, fx);
  // Same formula as modules/finance's summarizeFinanceDashboard() (the cover
  // dashboard's "Netto waarde" tile) — portfolio value + every savings
  // goal's saved_eur — so this headline stat never drifts from that one.
  const netWorthEur = currentPortfolioValueEur + savings.reduce((sum, goal) => sum + goal.saved_eur, 0);
  const etaMonths = investment
    ? etaMonthsToTarget(currentPortfolioValueEur, monthlyContributionEur, expectedReturnPct, investment.target_eur)
    : null;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold">Instellingen</h1>
        <p className="mt-1 text-sm text-stone-500">
          Scores zijn zichtbaar en groeien mee met je ratings — geen black box.
        </p>
      </section>

      <InstellingenTabs
        account={
          <InstellingenAccountTab
            sources={sources}
            categories={categories}
            topics={topics}
            voorkeurenSources={voorkeuren.sources}
            initieel={voorkeuren.initieel}
          />
        }
        financien={
          <InstellingenFinancienTab
            netWorthEur={netWorthEur}
            hasInvestmentGoal={investment !== null}
            etaMonths={etaMonths}
            initialMonthlyContributionOverride={settings?.monthly_contribution_override ?? null}
            initialExpectedReturnPct={expectedReturnPct}
            initialInvestmentGoal={investment}
            initialSavingsGoals={savings}
            currentPortfolioValueEur={currentPortfolioValueEur}
            monthlyContributionEur={monthlyContributionEur}
          />
        }
        pipeline={<InstellingenPipelineTab report={pipelineReport} />}
      />

      {/* Temporary mount (MOR-13) — MOR-18 folds this into the Account tab. */}
      <section className="border-t border-[var(--line)] pt-10">
        <MijnOnderzoek initial={research} />
      </section>
    </div>
  );
}
