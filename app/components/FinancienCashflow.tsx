"use client";

// Income/expense report (docs/prd/finance.md, Phase 4): manual income +
// categorized expenses, a monthly report with per-month totals + surplus,
// and recurring items projected forward. The current month's surplus is
// read by the parent page and passed into FinancienPortfolio as the
// projection's default DCA contribution (overridable there) — this
// component only owns the cashflow data + its own report section.

import { useMemo, useState } from "react";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import { monthlyTotals, projectRecurringForward, recurringMonthlyNet } from "../../modules/finance";
import { formatEuro } from "@/app/lib/geld";
import { FinancienIncomeForm } from "./FinancienIncomeForm";
import { FinancienExpenseForm } from "./FinancienExpenseForm";
import type { Expense, Income } from "@/modules/shared/types";

const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const ARCH = "font-[family-name:var(--font-archivo)]";
const MONO = "font-[family-name:var(--font-space-mono)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

const FORWARD_MONTHS = 3;

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function FinancienCashflow({
  initialIncomes,
  initialExpenses,
}: {
  initialIncomes: Income[];
  initialExpenses: Expense[];
}) {
  const [incomes, setIncomes] = useState(initialIncomes);
  const [expenses, setExpenses] = useState(initialExpenses);

  const todayMonth = new Date().toISOString().slice(0, 7);
  const actualRows = useMemo(() => monthlyTotals(incomes, expenses), [incomes, expenses]);
  const recurringNet = useMemo(() => recurringMonthlyNet(incomes, expenses), [incomes, expenses]);
  const lastActualMonth = actualRows.at(-1)?.month ?? todayMonth;
  const forwardRows = useMemo(
    () => projectRecurringForward(incomes, expenses, lastActualMonth, FORWARD_MONTHS),
    [incomes, expenses, lastActualMonth],
  );

  async function inkomenVerwijderen(id: string) {
    if (!confirm("Dit inkomen verwijderen?")) return;
    const response = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (response.ok) setIncomes((rows) => rows.filter((r) => r.id !== id));
  }

  async function uitgaveVerwijderen(id: string) {
    if (!confirm("Deze uitgave verwijderen?")) return;
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (response.ok) setExpenses((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div className={`${archivo.variable} ${grotesk.variable} ${mono.variable} mt-6`}>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em]`}>INKOMSTEN &amp; UITGAVEN</p>

        {actualRows.length === 0 && forwardRows.length === 0 ? (
          <p className={`${GROTESK} py-4 text-sm text-[var(--faint)]`}>
            Nog geen inkomsten of uitgaven ingevoerd — het maandoverzicht verschijnt zodra je de eerste toevoegt.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className={`${GROTESK} w-full min-w-[480px] text-sm`}>
              <thead>
                <tr className={`${MONO} border-b border-[var(--line)] text-left text-[10.5px] text-[var(--muted)] uppercase tracking-[.08em]`}>
                  <th className="py-2 pr-3 font-normal">Maand</th>
                  <th className="py-2 pr-3 text-right font-normal">Inkomsten</th>
                  <th className="py-2 pr-3 text-right font-normal">Uitgaven</th>
                  <th className="py-2 text-right font-normal">Overschot</th>
                </tr>
              </thead>
              <tbody>
                {actualRows.map((row) => (
                  <tr key={row.month} className="border-b border-[var(--line2)]">
                    <td className="py-2 pr-3 capitalize text-[var(--ink)]">{monthLabel(row.month)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--emer-t)]">{formatEuro(row.income_eur)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--rose)]">{formatEuro(row.expense_eur)}</td>
                    <td
                      className={`${ARCH} py-2 text-right font-bold ${
                        row.surplus_eur >= 0 ? "text-[var(--ink)]" : "text-[var(--rose)]"
                      }`}
                    >
                      {formatEuro(row.surplus_eur)}
                    </td>
                  </tr>
                ))}
                {forwardRows.map((row) => (
                  <tr key={row.month} className="border-b border-[var(--line2)] opacity-70">
                    <td className="py-2 pr-3 capitalize text-[var(--muted)]">
                      {monthLabel(row.month)}{" "}
                      <span className={`${MONO} text-[9px] font-bold text-[var(--accent)] uppercase`}>verwacht</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-[var(--muted)]">{formatEuro(row.income_eur)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--muted)]">{formatEuro(row.expense_eur)}</td>
                    <td className={`${ARCH} py-2 text-right font-bold text-[var(--muted)]`}>
                      {formatEuro(row.surplus_eur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`${MONO} mt-3 text-[11px] text-[var(--faint)]`}>
              &ldquo;Verwacht&rdquo; = terugkerende posten geprojecteerd; eenmalige posten tellen niet mee vooruit. Structureel
              maandsaldo (alleen terugkerend): <b className="text-[var(--ink2)]">{formatEuro(recurringNet)}</b>.
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 border-t border-[var(--line2)] pt-4 sm:grid-cols-2">
          <div>
            <p className={`${MONO} mb-2 text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Inkomen toevoegen</p>
            <FinancienIncomeForm onCreated={(income) => setIncomes((rows) => [...rows, income])} />
          </div>
          <div>
            <p className={`${MONO} mb-2 text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Uitgave toevoegen</p>
            <FinancienExpenseForm onCreated={(expense) => setExpenses((rows) => [...rows, expense])} />
          </div>
        </div>

        {(incomes.length > 0 || expenses.length > 0) && (
          <div className="mt-5 grid gap-4 border-t border-[var(--line2)] pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              {incomes
                .slice()
                .sort((a, b) => b.received_on.localeCompare(a.received_on))
                .slice(0, 8)
                .map((income) => (
                  <div key={income.id} className={`${MONO} flex items-center gap-2 text-[12px] text-[var(--muted)]`}>
                    <span className="text-[var(--ink2)]">{income.received_on}</span>
                    <span className="flex-1 truncate">{income.label ?? "Inkomen"}</span>
                    <span className="text-[var(--emer-t)]">{formatEuro(income.amount_eur)}</span>
                    <button onClick={() => inkomenVerwijderen(income.id)} className="text-[var(--rose)] hover:underline">
                      verwijderen
                    </button>
                  </div>
                ))}
            </div>
            <div className="space-y-1">
              {expenses
                .slice()
                .sort((a, b) => b.spent_on.localeCompare(a.spent_on))
                .slice(0, 8)
                .map((expense) => (
                  <div key={expense.id} className={`${MONO} flex items-center gap-2 text-[12px] text-[var(--muted)]`}>
                    <span className="text-[var(--ink2)]">{expense.spent_on}</span>
                    <span className="flex-1 truncate">
                      {expense.category}
                      {expense.label ? ` · ${expense.label}` : ""}
                    </span>
                    <span className="text-[var(--rose)]">{formatEuro(expense.amount_eur)}</span>
                    <button onClick={() => uitgaveVerwijderen(expense.id)} className="text-[var(--rose)] hover:underline">
                      verwijderen
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
