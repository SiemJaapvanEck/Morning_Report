"use client";

// Portfolio section of /financien (docs/prd/finance.md, Phase 3 + the Phase 4
// DCA-contribution wiring): holdings + buys CRUD, the live valuation summary,
// and the 3-line chart. Quotes/FX are fetched once on the server (Phase 2,
// `force-dynamic`) and passed down — this component never fetches market data
// itself, only reads/writes the manually-entered holdings/buys.
//
// FX note (Phase 3 modeling decision, flagged for Siem — see HANDOFF.md):
// there is no historical-FX source (PRD non-goal), so non-EUR buys use
// *today's* live rate as the cost-basis conversion (same rate the valuation
// uses) rather than contributing 0 €. A holding whose currency has no live
// rate at all still contributes 0 € and is flagged, per the module's
// documented "never guess a missing rate" contract.

import { useMemo, useState } from "react";
import { Archivo, Space_Grotesk, Space_Mono } from "next/font/google";
import { costBasisSeries, portfolioValueEur, projectCompound, quantityAsOf } from "../../modules/finance";
import { formatEuro, formatPct, parseAmount } from "@/app/lib/geld";
import { FinancienChart } from "./FinancienChart";
import { FinancienHoldingForm } from "./FinancienHoldingForm";
import { FinancienBuyForm } from "./FinancienBuyForm";
import type { FinanceQuote, Holding, HoldingBuy, HoldingKind } from "@/modules/shared/types";

const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-archivo" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const ARCH = "font-[family-name:var(--font-archivo)]";
const MONO = "font-[family-name:var(--font-space-mono)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

const KIND_LABEL: Record<HoldingKind, string> = {
  aandeel: "Aandeel",
  etf: "ETF",
  crypto: "Crypto",
  overig: "Overig",
};

const PROJECTION_MONTHS = 24;

function HoldingRow({
  holding,
  buys,
  quote,
  fxRate,
  onUpdated,
  onDeleted,
  onBuyCreated,
  onBuyDeleted,
}: {
  holding: Holding;
  buys: HoldingBuy[];
  quote: FinanceQuote | undefined;
  fxRate: number | undefined;
  onUpdated: (holding: Holding) => void;
  onDeleted: (id: string) => void;
  onBuyCreated: (buy: HoldingBuy) => void;
  onBuyDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingBuy, setAddingBuy] = useState(false);
  const [showBuys, setShowBuys] = useState(false);
  const [name, setName] = useState(holding.name ?? "");
  const [kind, setKind] = useState<HoldingKind>(holding.kind);
  const [currency, setCurrency] = useState(holding.currency);
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const qty = quantityAsOf(buys, today);
  const valueEur = quote && fxRate !== undefined ? qty * quote.price * fxRate : null;
  const koersOnbekend = !quote;
  const fxOnbekend = holding.currency !== "EUR" && fxRate === undefined;

  async function opslaan() {
    setBusy(true);
    const response = await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: holding.id, name: name || null, kind, currency }),
    });
    setBusy(false);
    if (response.ok) {
      onUpdated({ ...holding, name: name || null, kind, currency });
      setEditing(false);
    }
  }

  async function verwijderen() {
    if (!confirm(`"${holding.symbol}" en al zijn aankopen verwijderen?`)) return;
    setBusy(true);
    const response = await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: holding.id }),
    });
    setBusy(false);
    if (response.ok) onDeleted(holding.id);
  }

  async function buyVerwijderen(id: string) {
    if (!confirm("Deze aankoop verwijderen?")) return;
    const response = await fetch("/api/holding-buys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (response.ok) onBuyDeleted(id);
  }

  return (
    <div className="border-t border-[var(--line2)] py-3 first:border-t-0">
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <span className={`${MONO} rounded bg-[var(--stone-b)] px-2 py-1 text-xs font-bold text-[var(--stone-t)]`}>
            {holding.symbol}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Naam"
            className="min-w-32 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-sm"
          />
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as HoldingKind)}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-sm"
          >
            {Object.entries(KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="w-16 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-sm"
          />
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
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className={`${MONO} rounded bg-[var(--stone-b)] px-2 py-1 text-xs font-bold text-[var(--stone-t)]`}>
            {holding.symbol}
          </span>
          <span className={`${GROTESK} font-medium text-[var(--ink)]`}>{holding.name ?? holding.symbol}</span>
          <span className={`${MONO} text-[11px] text-[var(--faint)] uppercase`}>{KIND_LABEL[holding.kind]}</span>
          <span className={`${MONO} text-[11px] text-[var(--faint)]`}>{qty} stuks</span>
          <span className={`${ARCH} ml-auto font-bold text-[var(--ink)]`}>
            {valueEur != null ? formatEuro(valueEur) : "—"}
          </span>
          {koersOnbekend && (
            <span className={`${MONO} text-[10px] font-bold text-[var(--amber-t)] uppercase`}>koers onbekend</span>
          )}
          {!koersOnbekend && fxOnbekend && (
            <span className={`${MONO} text-[10px] font-bold text-[var(--amber-t)] uppercase`}>
              wisselkoers onbekend
            </span>
          )}
          <button onClick={() => setShowBuys((v) => !v)} className="text-sm text-[var(--accent)] hover:underline">
            {buys.length} {buys.length === 1 ? "aankoop" : "aankopen"}
          </button>
          <button onClick={() => setEditing(true)} className="text-sm text-[var(--muted)] hover:underline">
            bewerken
          </button>
          <button onClick={verwijderen} disabled={busy} className="text-sm text-[var(--rose)] hover:underline">
            verwijderen
          </button>
        </div>
      )}

      {showBuys && (
        <div className="mt-3 space-y-1.5 pl-2">
          {buys
            .slice()
            .sort((a, b) => b.bought_on.localeCompare(a.bought_on))
            .map((buy) => (
              <div
                key={buy.id}
                className={`${MONO} flex items-center gap-3 text-[12px] text-[var(--muted)]`}
              >
                <span className="text-[var(--ink2)]">{buy.bought_on}</span>
                <span>
                  {buy.quantity} × {buy.price_native} {buy.currency}
                </span>
                {buy.fee_eur > 0 && <span>+ {formatEuro(buy.fee_eur)} fee</span>}
                <button onClick={() => buyVerwijderen(buy.id)} className="text-[var(--rose)] hover:underline">
                  verwijderen
                </button>
              </div>
            ))}
          {addingBuy ? (
            <div className="pt-1">
              <FinancienBuyForm
                holdingId={holding.id}
                defaultCurrency={holding.currency}
                onCreated={(buy) => {
                  onBuyCreated(buy);
                  setAddingBuy(false);
                }}
                onCancel={() => setAddingBuy(false)}
              />
            </div>
          ) : (
            <button onClick={() => setAddingBuy(true)} className="pt-1 text-sm text-[var(--accent)] hover:underline">
              + aankoop toevoegen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FinancienPortfolio({
  initialHoldings,
  initialBuys,
  quotes,
  fx,
  expectedReturnPct,
  defaultMonthlyContributionEur,
  todayIso,
}: {
  initialHoldings: Holding[];
  initialBuys: HoldingBuy[];
  quotes: Record<string, FinanceQuote>;
  fx: Record<string, number>;
  expectedReturnPct: number;
  defaultMonthlyContributionEur: number;
  todayIso: string;
}) {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [buys, setBuys] = useState(initialBuys);
  const [contributionInput, setContributionInput] = useState(String(Math.round(defaultMonthlyContributionEur)));

  const fxFor = (currency: string) => (currency === "EUR" ? 1 : fx[currency]);

  const currentValueEur = useMemo(
    () => portfolioValueEur(holdings, buys, quotes, fx),
    [holdings, buys, quotes, fx],
  );

  const costBasis = useMemo(
    () =>
      costBasisSeries(
        buys.map((buy) => ({
          bought_on: buy.bought_on,
          quantity: buy.quantity,
          price_native: buy.price_native,
          currency: buy.currency,
          fee_eur: buy.fee_eur,
          fx_to_eur: buy.currency === "EUR" ? 1 : fx[buy.currency],
        })),
      ),
    [buys, fx],
  );

  const costBasisTotal = costBasis.at(-1)?.cost_basis_eur ?? 0;
  const rendementPct = costBasisTotal > 0 ? ((currentValueEur - costBasisTotal) / costBasisTotal) * 100 : null;

  const monthlyContribution = parseAmount(contributionInput) ?? 0;
  const projection = useMemo(
    () => projectCompound(currentValueEur, monthlyContribution, expectedReturnPct, PROJECTION_MONTHS),
    [currentValueEur, monthlyContribution, expectedReturnPct],
  );

  return (
    <div className={`${archivo.variable} ${grotesk.variable} ${mono.variable}`}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Huidige waarde</p>
          <p className={`${ARCH} mt-1 text-2xl font-black text-[var(--ink)]`}>{formatEuro(currentValueEur)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Kostenbasis</p>
          <p className={`${ARCH} mt-1 text-2xl font-black text-[var(--ink)]`}>{formatEuro(costBasisTotal)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>Rendement</p>
          <p
            className={`${ARCH} mt-1 text-2xl font-black ${
              rendementPct == null ? "text-[var(--faint)]" : rendementPct >= 0 ? "text-[var(--emer-t)]" : "text-[var(--rose)]"
            }`}
          >
            {rendementPct == null ? "—" : formatPct(rendementPct)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <label className={`${MONO} block text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>
            Maandelijkse inleg (DCA)
          </label>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`${ARCH} text-lg text-[var(--muted)]`}>€</span>
            <input
              value={contributionInput}
              onChange={(event) => setContributionInput(event.target.value)}
              className={`${ARCH} w-full border-b border-[var(--line)] bg-transparent text-2xl font-black text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none`}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em]`}>PORTEFEUILLE · {formatPct(expectedReturnPct)} verwacht rendement p/j</p>
        <div className="mt-3">
          <FinancienChart costBasis={costBasis} currentValueEur={currentValueEur} projection={projection} todayIso={todayIso} />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className={`${MONO} mb-1 text-[11px] text-[var(--muted)] tracking-[.14em]`}>HOLDINGS</p>
        {holdings.length === 0 ? (
          <p className={`${GROTESK} py-4 text-sm text-[var(--faint)]`}>
            Nog geen holdings. Voeg er hieronder een toe.
          </p>
        ) : (
          <div>
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.id}
                holding={holding}
                buys={buys.filter((b) => b.holding_id === holding.id)}
                quote={quotes[holding.symbol]}
                fxRate={fxFor(holding.currency)}
                onUpdated={(updated) => setHoldings((hs) => hs.map((h) => (h.id === updated.id ? updated : h)))}
                onDeleted={(id) => {
                  setHoldings((hs) => hs.filter((h) => h.id !== id));
                  setBuys((bs) => bs.filter((b) => b.holding_id !== id));
                }}
                onBuyCreated={(buy) => setBuys((bs) => [...bs, buy])}
                onBuyDeleted={(id) => setBuys((bs) => bs.filter((b) => b.id !== id))}
              />
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-[var(--line2)] pt-4">
          <FinancienHoldingForm onCreated={(holding) => setHoldings((hs) => [...hs, holding])} />
        </div>
      </div>
    </div>
  );
}
