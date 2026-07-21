"use client";

// Goals section of /financien (docs/prd/finance.md, Phase 5): the one
// investment goal (target € + ETA, derived from the live portfolio value +
// the DCA contribution + the expected return) and the named savings goals
// (manual saved_eur, progress bar). Also owns the small
// expected_return_pct control that writes finance_settings — the single
// knob both the projection chart (Phase 3) and this section's ETA read.
//
// Locked decisions (PRD Phase 5): exactly one investment goal (server
// enforces this — see app/api/goals/route.ts); savings progress is manual
// saved_eur, no bank auto-linking; ETA capped at 600 months →
// "buiten bereik" when `etaMonthsToTarget` returns null.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import { etaMonthsToTarget, goalProgressPct } from "../../modules/finance";
import { formatEuro, formatPct, parseAmount } from "@/app/lib/geld";
import type { FinanceGoal, FinanceGoalKind } from "@/modules/shared/types";

const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const MONO = "font-[family-name:var(--font-space-mono)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--stone-b)]">
      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** "~N maanden" / "doel al bereikt" / "buiten bereik" — presentational only, not exported. */
function etaLabel(months: number | null): string {
  if (months === null) return "buiten bereik";
  if (months === 0) return "doel al bereikt";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years > 0 ? `${years} jaar` : null, rest > 0 ? `${rest} mnd` : null].filter(Boolean);
  return `~${parts.join(" ")}`;
}

function GoalForm({
  kind,
  onCreated,
  onCancel,
}: {
  kind: FinanceGoalKind;
  onCreated: (goal: FinanceGoal) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [savedEur, setSavedEur] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "fout">("idle");
  const [error, setError] = useState<string | null>(null);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    const target_eur = parseAmount(target);
    if (!name.trim() || target_eur == null || target_eur <= 0) return;
    setStatus("busy");
    setError(null);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        kind,
        name,
        target_eur,
        target_date: targetDate || null,
        saved_eur: kind === "savings" ? parseAmount(savedEur) ?? 0 : undefined,
      }),
    });
    if (response.ok) {
      const { goal } = (await response.json()) as { goal: FinanceGoal };
      onCreated(goal);
      setName("");
      setTarget("");
      setSavedEur("0");
      setTargetDate("");
      setStatus("idle");
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Mislukt, probeer opnieuw");
      setStatus("fout");
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Naam
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === "investment" ? "bv. Financieel onafhankelijk" : "bv. Vakantie"}
          className="min-w-40 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Doelbedrag (€)
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="100.000"
          className="w-32 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      {kind === "savings" && (
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Al gespaard (€)
          <input
            value={savedEur}
            onChange={(event) => setSavedEur(event.target.value)}
            className="w-28 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Streefdatum (optioneel)
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <button
        type="submit"
        disabled={status === "busy" || !name.trim() || !target.trim()}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "busy" ? "…" : kind === "investment" ? "Beleggingsdoel instellen" : "Spaardoel toevoegen"}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]"
        >
          Annuleren
        </button>
      )}
      {status === "fout" && <span className="self-center text-sm text-[var(--rose)]">{error}</span>}
    </form>
  );
}

function InvestmentGoalCard({
  goal,
  currentValueEur,
  etaMonths,
  onUpdated,
  onDeleted,
}: {
  goal: FinanceGoal;
  currentValueEur: number;
  etaMonths: number | null;
  onUpdated: (goal: FinanceGoal) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target_eur));
  const [targetDate, setTargetDate] = useState(goal.target_date ?? "");
  const [busy, setBusy] = useState(false);

  const pct = goalProgressPct(currentValueEur, goal.target_eur);

  async function opslaan() {
    const target_eur = parseAmount(target);
    if (!name.trim() || target_eur == null || target_eur <= 0) return;
    setBusy(true);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: goal.id, name, target_eur, target_date: targetDate || null }),
    });
    setBusy(false);
    if (response.ok) {
      onUpdated({ ...goal, name: name.trim(), target_eur, target_date: targetDate || null });
      setEditing(false);
    }
  }

  async function verwijderen() {
    if (!confirm(`"${goal.name}" verwijderen?`)) return;
    setBusy(true);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: goal.id }),
    });
    setBusy(false);
    if (response.ok) onDeleted();
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Naam
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-40 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Doelbedrag (€)
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="w-32 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Streefdatum
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <button
          onClick={opslaan}
          disabled={busy}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Opslaan
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]"
        >
          Annuleren
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`${GROTESK} font-medium text-[var(--ink)]`}>{goal.name}</span>
        {goal.target_date && (
          <span className={`${MONO} text-[11px] text-[var(--faint)]`}>streefdatum {goal.target_date}</span>
        )}
        <div className="ml-auto flex gap-3">
          <button onClick={() => setEditing(true)} className="text-sm text-[var(--muted)] hover:underline">
            bewerken
          </button>
          <button onClick={verwijderen} disabled={busy} className="text-sm text-[var(--rose)] hover:underline">
            verwijderen
          </button>
        </div>
      </div>
      <div className="mt-2">
        <ProgressBar pct={pct} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={`${MONO} text-[12px] text-[var(--muted)]`}>
          {formatEuro(currentValueEur)} / {formatEuro(goal.target_eur)} · {formatPct(pct)}
        </span>
        <span className={`${MONO} text-[12px] font-bold text-[var(--accent)]`}>ETA {etaLabel(etaMonths)}</span>
      </div>
    </div>
  );
}

function SavingsGoalRow({
  goal,
  onUpdated,
  onDeleted,
}: {
  goal: FinanceGoal;
  onUpdated: (goal: FinanceGoal) => void;
  onDeleted: (id: string) => void;
}) {
  const [editingSaved, setEditingSaved] = useState(false);
  const [savedInput, setSavedInput] = useState(String(goal.saved_eur));
  const [busy, setBusy] = useState(false);

  const pct = goalProgressPct(goal.saved_eur, goal.target_eur);

  async function opslaan() {
    const saved_eur = parseAmount(savedInput);
    if (saved_eur == null || saved_eur < 0) return;
    setBusy(true);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: goal.id, saved_eur }),
    });
    setBusy(false);
    if (response.ok) {
      onUpdated({ ...goal, saved_eur });
      setEditingSaved(false);
    }
  }

  async function verwijderen() {
    if (!confirm(`"${goal.name}" verwijderen?`)) return;
    setBusy(true);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: goal.id }),
    });
    setBusy(false);
    if (response.ok) onDeleted(goal.id);
  }

  return (
    <div className="border-t border-[var(--line2)] py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`${GROTESK} font-medium text-[var(--ink)]`}>{goal.name}</span>
        {goal.target_date && (
          <span className={`${MONO} text-[11px] text-[var(--faint)]`}>streefdatum {goal.target_date}</span>
        )}
        <div className="ml-auto flex gap-3">
          <button onClick={() => setEditingSaved((v) => !v)} className="text-sm text-[var(--accent)] hover:underline">
            bijwerken
          </button>
          <button onClick={verwijderen} disabled={busy} className="text-sm text-[var(--rose)] hover:underline">
            verwijderen
          </button>
        </div>
      </div>
      <div className="mt-2">
        <ProgressBar pct={pct} />
      </div>
      <p className={`${MONO} mt-1.5 text-[12px] text-[var(--muted)]`}>
        {formatEuro(goal.saved_eur)} / {formatEuro(goal.target_eur)} · {formatPct(pct)}
      </p>
      {editingSaved && (
        <div className="mt-2 flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Al gespaard (€)
            <input
              value={savedInput}
              onChange={(event) => setSavedInput(event.target.value)}
              className="w-28 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm"
            />
          </label>
          <button
            onClick={opslaan}
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Opslaan
          </button>
        </div>
      )}
    </div>
  );
}

export function FinancienGoals({
  initialInvestmentGoal,
  initialSavingsGoals,
  currentPortfolioValueEur,
  monthlyContributionEur,
  initialExpectedReturnPct,
}: {
  initialInvestmentGoal: FinanceGoal | null;
  initialSavingsGoals: FinanceGoal[];
  currentPortfolioValueEur: number;
  monthlyContributionEur: number;
  initialExpectedReturnPct: number;
}) {
  const router = useRouter();
  const [investmentGoal, setInvestmentGoal] = useState(initialInvestmentGoal);
  const [savingsGoals, setSavingsGoals] = useState(initialSavingsGoals);
  const [expectedReturnPct, setExpectedReturnPct] = useState(initialExpectedReturnPct);
  const [returnInput, setReturnInput] = useState(String(initialExpectedReturnPct));
  const [returnStatus, setReturnStatus] = useState<"idle" | "busy" | "fout" | "ok">("idle");

  const etaMonths = useMemo(
    () =>
      investmentGoal
        ? etaMonthsToTarget(currentPortfolioValueEur, monthlyContributionEur, expectedReturnPct, investmentGoal.target_eur)
        : null,
    [investmentGoal, currentPortfolioValueEur, monthlyContributionEur, expectedReturnPct],
  );

  async function rendementOpslaan() {
    const pct = parseAmount(returnInput);
    if (pct == null) return;
    setReturnStatus("busy");
    const response = await fetch("/api/finance-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_return_pct: pct }),
    });
    if (response.ok) {
      setExpectedReturnPct(pct);
      setReturnStatus("ok");
      router.refresh();
    } else {
      setReturnStatus("fout");
    }
  }

  return (
    <div className={`${archivo.variable} ${grotesk.variable} ${mono.variable} mt-6`}>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em]`}>DOELEN</p>
          <label className={`${MONO} flex items-center gap-2 text-[10.5px] text-[var(--muted)] uppercase tracking-[.08em]`}>
            Verwacht rendement p/j
            <input
              value={returnInput}
              onChange={(event) => setReturnInput(event.target.value)}
              className="w-16 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-right text-sm text-[var(--ink)] normal-case"
            />
            %
            <button
              onClick={rendementOpslaan}
              disabled={returnStatus === "busy"}
              className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white normal-case disabled:opacity-50"
            >
              Opslaan
            </button>
            {returnStatus === "ok" && <span className="text-[var(--emer-t)] normal-case">opgeslagen</span>}
            {returnStatus === "fout" && <span className="text-[var(--rose)] normal-case">mislukt</span>}
          </label>
        </div>

        <div className="mt-4">
          <p className={`${MONO} mb-2 text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Beleggingsdoel</p>
          {investmentGoal ? (
            <InvestmentGoalCard
              goal={investmentGoal}
              currentValueEur={currentPortfolioValueEur}
              etaMonths={etaMonths}
              onUpdated={setInvestmentGoal}
              onDeleted={() => setInvestmentGoal(null)}
            />
          ) : (
            <GoalForm kind="investment" onCreated={setInvestmentGoal} />
          )}
        </div>

        <div className="mt-6 border-t border-[var(--line2)] pt-4">
          <p className={`${MONO} mb-2 text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Spaardoelen</p>
          {savingsGoals.length === 0 ? (
            <p className={`${GROTESK} py-2 text-sm text-[var(--faint)]`}>Nog geen spaardoelen — voeg er hieronder een toe.</p>
          ) : (
            <div>
              {savingsGoals.map((goal) => (
                <SavingsGoalRow
                  key={goal.id}
                  goal={goal}
                  onUpdated={(updated) => setSavingsGoals((gs) => gs.map((g) => (g.id === updated.id ? updated : g)))}
                  onDeleted={(id) => setSavingsGoals((gs) => gs.filter((g) => g.id !== id))}
                />
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-[var(--line2)] pt-4">
            <GoalForm kind="savings" onCreated={(goal) => setSavingsGoals((gs) => [...gs, goal])} />
          </div>
        </div>
      </div>
    </div>
  );
}
