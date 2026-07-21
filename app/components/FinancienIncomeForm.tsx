"use client";

// Add-income form (docs/prd/finance.md, Phase 4) — same shape as
// CaptureFormulier.tsx: local state, POST, reset on success.

import { useState } from "react";
import { parseAmount } from "@/app/lib/geld";
import type { Income } from "@/modules/shared/types";

export function FinancienIncomeForm({ onCreated }: { onCreated: (income: Income) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [receivedOn, setReceivedOn] = useState(today);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [status, setStatus] = useState<"idle" | "busy" | "fout">("idle");

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    const amount_eur = parseAmount(amount);
    if (!receivedOn || amount_eur == null) return;
    setStatus("busy");
    const response = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        received_on: receivedOn,
        label: label || null,
        amount_eur,
        recurring,
      }),
    });
    if (response.ok) {
      const { income } = (await response.json()) as { income: Income };
      onCreated(income);
      setLabel("");
      setAmount("");
      setStatus("idle");
    } else {
      setStatus("fout");
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Datum
        <input
          type="date"
          value={receivedOn}
          max={today}
          onChange={(event) => setReceivedOn(event.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Omschrijving (optioneel)
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="bv. Salaris"
          className="min-w-40 flex-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Bedrag (€)
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="3.000,00"
          className="w-32 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-xs text-[var(--muted)]">
        <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
        Terugkerend
      </label>
      <button
        type="submit"
        disabled={status === "busy" || !amount.trim()}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "busy" ? "…" : "Inkomen toevoegen"}
      </button>
      {status === "fout" && <span className="self-center text-sm text-[var(--rose)]">Mislukt, probeer opnieuw</span>}
    </form>
  );
}
