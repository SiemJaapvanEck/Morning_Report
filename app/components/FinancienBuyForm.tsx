"use client";

// Add-buy form (docs/prd/finance.md, Phase 3) — one buy lot for a given
// holding. Same shape as CaptureFormulier.tsx: local state, POST, reset.

import { useState } from "react";
import { parseAmount } from "@/app/lib/geld";
import type { HoldingBuy } from "@/modules/shared/types";

export function FinancienBuyForm({
  holdingId,
  defaultCurrency,
  onCreated,
  onCancel,
}: {
  holdingId: string;
  defaultCurrency: string;
  onCreated: (buy: HoldingBuy) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [boughtOn, setBoughtOn] = useState(today);
  const [quantity, setQuantity] = useState("");
  const [priceNative, setPriceNative] = useState("");
  const [feeEur, setFeeEur] = useState("0");
  const [status, setStatus] = useState<"idle" | "busy" | "fout">("idle");

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    const qty = parseAmount(quantity);
    const price = parseAmount(priceNative);
    const fee = parseAmount(feeEur) ?? 0;
    if (!boughtOn || qty == null || qty <= 0 || price == null || price < 0) return;
    setStatus("busy");
    const response = await fetch("/api/holding-buys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        holding_id: holdingId,
        bought_on: boughtOn,
        quantity: qty,
        price_native: price,
        currency: defaultCurrency,
        fee_eur: fee,
      }),
    });
    if (response.ok) {
      const { buy } = (await response.json()) as { buy: HoldingBuy };
      onCreated(buy);
      setQuantity("");
      setPriceNative("");
      setFeeEur("0");
      setStatus("idle");
    } else {
      setStatus("fout");
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-wrap items-end gap-2 rounded-lg bg-[var(--accent-tint)]/40 p-3">
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Datum
        <input
          type="date"
          value={boughtOn}
          max={today}
          onChange={(event) => setBoughtOn(event.target.value)}
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Aantal
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="10"
          className="w-24 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Prijs ({defaultCurrency})
        <input
          value={priceNative}
          onChange={(event) => setPriceNative(event.target.value)}
          placeholder="123,45"
          className="w-28 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm text-[var(--ink)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Fee (€)
        <input
          value={feeEur}
          onChange={(event) => setFeeEur(event.target.value)}
          className="w-20 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm text-[var(--ink)]"
        />
      </label>
      <button
        type="submit"
        disabled={status === "busy"}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "busy" ? "…" : "Opslaan"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]"
      >
        Annuleren
      </button>
      {status === "fout" && <span className="self-center text-sm text-[var(--rose)]">Mislukt, probeer opnieuw</span>}
    </form>
  );
}
