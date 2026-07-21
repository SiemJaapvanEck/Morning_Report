"use client";

// Add-holding form (docs/prd/finance.md, Phase 3) — same shape as
// CaptureFormulier.tsx: local state, POST, reset on success.

import { useState } from "react";
import type { Holding, HoldingKind } from "@/modules/shared/types";

const KIND_LABEL: Record<HoldingKind, string> = {
  aandeel: "Aandeel",
  etf: "ETF",
  crypto: "Crypto",
  overig: "Overig",
};

export function FinancienHoldingForm({ onCreated }: { onCreated: (holding: Holding) => void }) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HoldingKind>("aandeel");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState<"idle" | "busy" | "fout">("idle");

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    if (!symbol.trim() || !currency.trim()) return;
    setStatus("busy");
    const response = await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", symbol, name: name || null, kind, currency }),
    });
    if (response.ok) {
      const { holding } = (await response.json()) as { holding: Holding };
      onCreated(holding);
      setSymbol("");
      setName("");
      setKind("aandeel");
      setCurrency("USD");
      setStatus("idle");
    } else {
      setStatus("fout");
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Ticker
        <input
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          placeholder="bv. AAPL"
          className="w-28 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Naam (optioneel)
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="bv. Apple Inc."
          className="min-w-40 flex-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Soort
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as HoldingKind)}
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-2 text-sm text-[var(--ink)]"
        >
          {Object.entries(KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Valuta
        <input
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          placeholder="USD"
          className="w-20 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-sm text-[var(--ink)]"
        />
      </label>
      <button
        type="submit"
        disabled={status === "busy" || !symbol.trim() || !currency.trim()}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "busy" ? "…" : "Holding toevoegen"}
      </button>
      {status === "fout" && <span className="self-center text-sm text-[var(--rose)]">Mislukt, probeer opnieuw</span>}
    </form>
  );
}
