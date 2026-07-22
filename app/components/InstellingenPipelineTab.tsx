// Pipeline-rapport tab content (docs/prd/settings-tabs.md, Phase 2): what the
// pipeline produced and cost — today's edition detail plus 7/30-day trends.
// Read-only, server-rendered (no interactivity, so no "use client" — matches
// InstellingenAccountTab). Data comes from `getPipelineReport()`
// (app/lib/queries.ts), which wraps the pure aggregation in
// modules/pipeline-report; this component only renders. Recipe:
// docs/brandbook.md §7 "Pipeline-rapport tab".

import { formatEuro } from "@/app/lib/geld";
import { categoryColor, seriesPoints, type LinePoint } from "@/app/lib/stories";
import type { PipelineReport } from "@/app/lib/queries";
import type { EditionAgg } from "@/modules/pipeline-report";

const MONO = "font-[family-name:var(--font-space-mono)]";
const ARCH = "font-[family-name:var(--font-archivo)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

const STEP_LABEL: Record<string, string> = {
  ingest: "Ophalen bronnen",
  weather: "Weer",
  markten: "Markten",
  scan_rank: "Scannen & scoren",
  select: "Selecteren",
  threads: "Verhaallijnen",
  agenda: "Agenda",
  generate: "Genereren",
  daily_paper: "Dagblad",
  finalize: "Afronden",
};

function stepLabel(kind: string): string {
  return STEP_LABEL[kind] ?? kind.replace(/_/g, " ");
}

function formatSeconds(s: number): string {
  return `${s.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`;
}

function StatTile({ label, value, faint = false }: { label: string; value: string; faint?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
      <p className={`${MONO} text-[10.5px] text-[var(--muted)] uppercase tracking-[.1em]`}>{label}</p>
      <p className={`${ARCH} mt-1 text-2xl font-black ${faint ? "text-[var(--faint)]" : "text-[var(--ink)]"}`}>
        {value}
      </p>
    </div>
  );
}

function toPolylinePoints(points: LinePoint[]): string {
  return points.map((p) => `${p.x},${100 - p.y}`).join(" ");
}

/** A small inline-SVG trend line over one edition-count series (§7 sparkline recipe). */
function Sparkline({ series, color }: { series: number[]; color: string }) {
  if (series.length === 0) {
    return <p className={`${GROTESK} text-xs text-[var(--faint)]`}>Nog geen edities.</p>;
  }
  const max = Math.max(1, ...series);
  const points = seriesPoints(series, max);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-12 w-full overflow-visible" role="img" aria-label="Trend">
      <polyline
        points={toPolylinePoints(points)}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function TrendCard({
  title,
  last7,
  last30,
  color,
  format,
}: {
  title: string;
  last7: EditionAgg[];
  last30: EditionAgg[];
  color: string;
  format: (agg: EditionAgg) => number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <p className={`${MONO} text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>{title}</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className={`${MONO} text-[10px] text-[var(--faint)] uppercase tracking-[.08em]`}>Laatste 7 edities</p>
          <Sparkline series={last7.map(format)} color={color} />
        </div>
        <div>
          <p className={`${MONO} text-[10px] text-[var(--faint)] uppercase tracking-[.08em]`}>Laatste 30 edities</p>
          <Sparkline series={last30.map(format)} color={color} />
        </div>
      </div>
    </div>
  );
}

export function InstellingenPipelineTab({ report }: { report: PipelineReport }) {
  const { today, trends, hasEdition } = report;

  return (
    <div className="space-y-8">
      {!hasEdition && (
        <p className={`${GROTESK} text-sm text-[var(--muted)]`}>
          Nog geen editie voor vandaag — cijfers verschijnen zodra de pipeline draait.
        </p>
      )}

      <div>
        <p className={`${MONO} mb-3 text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>Vandaag</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Kosten" value={formatEuro(today.costEur)} faint={!hasEdition} />
          <StatTile label="Artikelen" value={String(today.articleCount)} faint={!hasEdition} />
          <StatTile label="Bronnen" value={String(today.sourceCount)} faint={!hasEdition} />
          <StatTile label="Sol-artikelen" value={String(today.solArticleCount)} faint={!hasEdition} />
          <StatTile label="Deep-research" value={String(today.deepResearchCount)} faint={!hasEdition} />
        </div>
      </div>

      {today.articlesByCategory.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <p className={`${MONO} mb-3 text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>
            Artikelen per categorie
          </p>
          <div className="space-y-2">
            {today.articlesByCategory.map((cat) => {
              const max = today.articlesByCategory[0].count;
              const pct = max > 0 ? (cat.count / max) * 100 : 0;
              const color = categoryColor(cat.category_slug);
              return (
                <div key={cat.category_id ?? "geen"} className="flex items-center gap-3">
                  <span className={`${GROTESK} w-32 shrink-0 truncate text-sm text-[var(--ink)]`}>
                    {cat.category_name ?? "Onbekend"}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--line2)]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </span>
                  <span className={`${MONO} w-6 shrink-0 text-right text-xs text-[var(--muted)]`}>{cat.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {today.stepDurations.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <p className={`${MONO} mb-3 text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>
            Stap-duur (gemiddeld)
          </p>
          <div className="divide-y divide-[var(--line2)]">
            {today.stepDurations.map((step) => (
              <div key={step.kind} className="flex items-center justify-between py-2">
                <span className={`${GROTESK} text-sm text-[var(--ink)]`}>{stepLabel(step.kind)}</span>
                <span className={`${MONO} text-xs text-[var(--muted)]`}>
                  {step.avgSeconds == null ? "loopt nog" : formatSeconds(step.avgSeconds)}
                  {step.count > 1 ? ` · ${step.count}×` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className={`${MONO} mb-3 text-[11px] text-[var(--muted)] tracking-[.14em] uppercase`}>Trends</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TrendCard
            title="Kosten per editie"
            last7={trends.last7}
            last30={trends.last30}
            color={categoryColor("financieel")}
            format={(agg) => agg.costEur}
          />
          <TrendCard
            title="Artikelen per editie"
            last7={trends.last7}
            last30={trends.last30}
            color="var(--accent)"
            format={(agg) => agg.articleCount}
          />
        </div>
      </div>
    </div>
  );
}
