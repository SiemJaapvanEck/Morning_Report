"use client";

// The 3-line portfolio chart (docs/prd/finance.md, Phase 3): cost basis
// (historical, first buy → today), the current-value "today" marker (locked
// decision: anchored at today, no historical backfill), and the forward
// compound projection. Recipe: docs/brandbook.md §4 "Financiën — portefeuille-
// grafiek". Color per the issue's locked convention: the amber `financieel`
// category color (via categoryColor(), never a new hardcoded hex) for the
// money lines; the accent token is reserved for the "today" marker, matching
// its documented role ("…, "today", storylines" — brandbook §1.1).

import { Space_Grotesk, Space_Mono } from "next/font/google";
import { buildPortfolioChart, toSegments, type PortfolioChartData } from "@/app/lib/financien";
import { formatEuro } from "@/app/lib/geld";
import { categoryColor, type LinePoint } from "@/app/lib/stories";
import type { CostBasisPoint } from "../../modules/finance";

const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-space-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const MONO = "font-[family-name:var(--font-space-mono)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

const AMBER = categoryColor("financieel");

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("nl-NL", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function toPolylinePoints(points: LinePoint[]): string {
  return points.map((p) => `${p.x},${100 - p.y}`).join(" ");
}

export function FinancienChart({
  costBasis,
  currentValueEur,
  projection,
  todayIso,
}: {
  costBasis: CostBasisPoint[];
  currentValueEur: number;
  projection: number[];
  todayIso: string;
}) {
  if (costBasis.length === 0 && currentValueEur === 0 && projection.every((v) => v === 0)) {
    return (
      <p className={`${GROTESK} text-sm text-[var(--muted)]`}>
        Nog geen holdings of aankopen — voeg er een toe om de grafiek te zien.
      </p>
    );
  }

  const data: PortfolioChartData = buildPortfolioChart(costBasis, currentValueEur, projection, todayIso);
  const values = [...data.costBasis, ...data.currentValue, ...data.projection].filter(
    (v): v is number => v != null,
  );
  const maxValue = Math.max(1, ...values);

  const costSegments = toSegments(data.costBasis, maxValue);
  const projSegments = toSegments(data.projection, maxValue);
  const todayPoints = toSegments(data.currentValue, maxValue).flat();

  return (
    <div className={`${grotesk.variable} ${mono.variable}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-56 w-full overflow-visible sm:h-64"
        role="img"
        aria-label="Portefeuillegrafiek: kostenbasis, huidige waarde en verwachte groei"
      >
        {[0, 50, 100].map((y) => (
          <line
            key={y}
            x1={0}
            x2={100}
            y1={y}
            y2={y}
            stroke="var(--line2)"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {costSegments.map((seg, i) => (
          <polyline
            key={`cost-${i}`}
            points={toPolylinePoints(seg)}
            fill="none"
            stroke={AMBER}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {projSegments.map((seg, i) => (
          <polyline
            key={`proj-${i}`}
            points={toPolylinePoints(seg)}
            fill="none"
            stroke={AMBER}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 3"
            opacity={0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {todayPoints.map((p, i) => (
          <circle
            key={`today-${i}`}
            cx={p.x}
            cy={100 - p.y}
            r={1.8}
            fill="var(--accent)"
            stroke="var(--paper)"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className={`${MONO} mt-2 flex justify-between text-[11px] text-[var(--faint)]`}>
        <span>{formatEuro(0)}</span>
        <span>{formatEuro(maxValue / 2)}</span>
        <span>{formatEuro(maxValue)}</span>
      </div>
      <div className={`${MONO} mt-1 flex justify-between text-[10px] text-[var(--faint)]`}>
        <span>{monthLabel(data.months[0])}</span>
        <span className="text-[var(--accent)]">{monthLabel(data.months[data.todayIndex])} · vandaag</span>
        <span>{monthLabel(data.months.at(-1) ?? data.months[0])}</span>
      </div>

      <div className={`${MONO} mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--muted)]`}>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: AMBER }} />
          Kostenbasis
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          Huidige waarde (vandaag)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-3 rounded-full"
            style={{ background: `repeating-linear-gradient(to right, ${AMBER} 0 3px, transparent 3px 6px)` }}
          />
          Verwachte groei
        </span>
      </div>
    </div>
  );
}
