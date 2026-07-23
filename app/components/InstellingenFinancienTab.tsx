"use client";

// Financiën tab of /instellingen (docs/prd/settings-tabs.md, Phase 3 —
// MOR-17). This component owns exactly one piece of logic: the quick-edit
// of `finance_settings.monthly_contribution_override` +
// `expected_return_pct`, POSTed to `/api/finance-settings` (partial upsert —
// see app/api/finance-settings/route.ts). Everything else is either a plain
// display (headline stats, reusing modules/finance's shared etaLabel()/the
// same net-worth formula as summarizeFinanceDashboard) or a mount of the
// unchanged Personal Finance components (`FinancienGoals`,
// `FinancienHoldingForm`) — no reimplementation of goal editing or holdings
// CRUD. Full portfolio/chart/kasstroom detail stays behind the `/financien`
// link (§5.1/§7bis brandbook).
//
// Graceful-empty-state note (acceptance criterion): the Personal Finance
// surfaces (Finance P3/P4/P5) are already merged to `main` at build time, so
// there's no runtime "not merged yet" branch here — same call the reviewed
// 22 Jul build made. If a future phase ever unmounts them, this tab would
// need its own InstellingenLeegState fallback then.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import { etaLabel } from "@/modules/finance";
import { formatEuro, parseAmount } from "@/app/lib/geld";
import { FinancienGoals } from "./FinancienGoals";
import { FinancienHoldingForm } from "./FinancienHoldingForm";
import type { FinanceGoal } from "@/modules/shared/types";

const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const MONO = "font-[family-name:var(--font-space-mono)]";
const ARCH = "font-[family-name:var(--font-archivo)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

function HeadlineTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Link
      href="/financien"
      className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 transition-transform hover:-translate-y-0.5"
    >
      <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>{label}</p>
      <p className={`${ARCH} mt-1 text-2xl font-black ${accent ? "text-[var(--accent)]" : "text-[var(--ink)]"}`}>
        {value}
      </p>
    </Link>
  );
}

export function InstellingenFinancienTab({
  netWorthEur,
  hasInvestmentGoal,
  etaMonths,
  initialMonthlyContributionOverride,
  initialExpectedReturnPct,
  initialInvestmentGoal,
  initialSavingsGoals,
  currentPortfolioValueEur,
  monthlyContributionEur,
}: {
  /** portfolio value + savings goals' saved_eur — same formula as summarizeFinanceDashboard(). */
  netWorthEur: number;
  hasInvestmentGoal: boolean;
  etaMonths: number | null;
  initialMonthlyContributionOverride: number | null;
  initialExpectedReturnPct: number;
  initialInvestmentGoal: FinanceGoal | null;
  initialSavingsGoals: FinanceGoal[];
  currentPortfolioValueEur: number;
  monthlyContributionEur: number;
}) {
  const router = useRouter();
  const [contributionInput, setContributionInput] = useState(
    initialMonthlyContributionOverride != null ? String(initialMonthlyContributionOverride) : "",
  );
  const [returnInput, setReturnInput] = useState(String(initialExpectedReturnPct));
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "fout">("idle");
  const [error, setError] = useState<string | null>(null);

  async function opslaan(event: React.FormEvent) {
    event.preventDefault();
    const trimmedContribution = contributionInput.trim();
    const monthly = trimmedContribution === "" ? null : parseAmount(trimmedContribution);
    const pct = parseAmount(returnInput);
    if (pct == null || (trimmedContribution !== "" && monthly == null)) {
      setStatus("fout");
      setError("Ongeldig bedrag of percentage");
      return;
    }
    setStatus("busy");
    setError(null);
    const response = await fetch("/api/finance-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_return_pct: pct, monthly_contribution_override: monthly }),
    });
    if (response.ok) {
      setStatus("ok");
      router.refresh();
    } else {
      const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(responseBody?.error ?? "Opslaan mislukt, probeer opnieuw");
      setStatus("fout");
    }
  }

  return (
    <div className={`${archivo.variable} ${grotesk.variable} ${mono.variable} space-y-6`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeadlineTile label="Netto waarde" value={formatEuro(netWorthEur)} />
        {hasInvestmentGoal && <HeadlineTile label="Beleggingsdoel ETA" value={etaLabel(etaMonths)} accent />}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>Snel bijwerken</p>
        <form onSubmit={opslaan} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Maandelijkse inleg (override)
            <input
              value={contributionInput}
              onChange={(event) => setContributionInput(event.target.value)}
              placeholder="automatisch (overschot)"
              className="w-44 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Verwacht rendement p/j (%)
            <input
              value={returnInput}
              onChange={(event) => setReturnInput(event.target.value)}
              className="w-28 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
            />
          </label>
          <button
            type="submit"
            disabled={status === "busy"}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "busy" ? "…" : "Opslaan"}
          </button>
          {status === "ok" && <span className="text-sm text-[var(--emer-t)]">opgeslagen</span>}
          {status === "fout" && <span className="text-sm text-[var(--rose)]">{error}</span>}
        </form>
        <p className={`${GROTESK} mt-2 text-xs text-[var(--faint)]`}>
          Leeg = automatisch berekend uit het maandoverschot (inkomsten − uitgaven).
        </p>
      </div>

      <FinancienGoals
        initialInvestmentGoal={initialInvestmentGoal}
        initialSavingsGoals={initialSavingsGoals}
        currentPortfolioValueEur={currentPortfolioValueEur}
        monthlyContributionEur={monthlyContributionEur}
        initialExpectedReturnPct={initialExpectedReturnPct}
      />

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>Holding toevoegen</p>
        <div className="mt-3">
          <FinancienHoldingForm onCreated={() => router.refresh()} />
        </div>
      </div>

      <p className="text-sm text-[var(--muted)]">
        Volledig overzicht, grafiek en kasstroom:{" "}
        <Link href="/financien" className="font-medium text-[var(--accent)] hover:underline">
          naar Financiën →
        </Link>
      </p>
    </div>
  );
}
