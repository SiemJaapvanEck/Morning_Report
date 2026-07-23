// Cover-dashboard finance tiles (docs/prd/finance.md, Phase 6): the four
// headline numbers — Netto waarde, Deze maand over, Beleggingsdoel ETA,
// Rendement % — read once server-side (`getFinanceDashboardSnapshot`, only
// for *today*'s edition — see EditionView/EditionScreen callers) and
// rendered here. Same stat-tile recipe as the Financiën page tiles
// (brandbook §5.2/§6): `rounded-2xl` `--paper` cards, Space Mono uppercase
// label, Archivo 900 value, each linking to `/financien`.
//
// CijfersCard-style empty state (brandbook §9 "hide, don't placeholder"):
// `snapshot === null` renders nothing (no finance data at all yet — the
// whole row hides). The ETA and Rendement tiles individually hide when
// there's no investment goal / no cost basis yet, rather than showing a
// dash — a real absence, not a loading/error state.

import Link from "next/link";
import { Archivo, Space_Mono } from "next/font/google";
import { etaLabel } from "@/modules/finance";
import type { FinanceDashboardSnapshot } from "@/modules/finance";
import { formatEuro, formatPct } from "@/app/lib/geld";

const archivo = Archivo({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-archivo" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const ARCH = "font-[family-name:var(--font-archivo)]";
const MONO = "font-[family-name:var(--font-space-mono)]";

function Tile({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <Link
      href="/financien"
      className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 transition-transform hover:-translate-y-0.5"
    >
      <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>{label}</p>
      <p className={`${ARCH} mt-1 text-2xl font-black ${valueClassName ?? "text-[var(--ink)]"}`}>{value}</p>
    </Link>
  );
}

export function FinanceDashboardTiles({ snapshot }: { snapshot: FinanceDashboardSnapshot | null }) {
  if (!snapshot) return null;

  return (
    <div className={`${archivo.variable} ${mono.variable} grid grid-cols-2 gap-3 sm:grid-cols-4`}>
      <Tile label="Netto waarde" value={formatEuro(snapshot.netWorthEur)} />
      <Tile
        label="Deze maand over"
        value={formatEuro(snapshot.monthlySurplusEur)}
        valueClassName={snapshot.monthlySurplusEur >= 0 ? "text-[var(--ink)]" : "text-[var(--rose)]"}
      />
      {snapshot.hasInvestmentGoal && (
        <Tile label="Beleggingsdoel ETA" value={etaLabel(snapshot.etaMonths)} valueClassName="text-[var(--accent)]" />
      )}
      {snapshot.hasCostBasis && (
        <Tile
          label="Rendement"
          value={formatPct(snapshot.rendementPct ?? 0)}
          valueClassName={(snapshot.rendementPct ?? 0) >= 0 ? "text-[var(--emer-t)]" : "text-[var(--rose)]"}
        />
      )}
    </div>
  );
}
