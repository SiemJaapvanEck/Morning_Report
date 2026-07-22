// Pipeline-rapport aggregation core (docs/prd/settings-tabs.md, Phase 2). Pure
// functions only — no Supabase/React/Next: every function here takes plain
// rows and returns plain data. `getPipelineReport()` in `app/lib/queries.ts`
// reads editions/pipeline_steps/usage_log/edition_items (joined to
// items→categories/sources), flattens them into the row shapes below, and
// the Pipeline-rapport settings tab renders the result.
//
// Essentials only (locked PRD decision): articles-by-category, distinct
// sources, € cost, Sol article count, deep-research count, and per-kind step
// timing for today; € cost + article count per edition for the last 7 and 30
// editions. No token/Tavily/failed-step drill-down in V1.

// ============================================================
// Today's edition report
// ============================================================

/**
 * One `edition_items` row for today's edition, flattened with its item's
 * category + source. `has_article` mirrors `edition_items.article != null`
 * (a structured deep-research article) — the caller checks that, this module
 * only sees the boolean.
 */
export interface PipelineItemRow {
  band: string;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  source_id: string | null;
  sol_note: string | null;
  has_article: boolean;
}

/** One `pipeline_steps` row for today's edition. */
export interface PipelineStepRow {
  kind: string;
  started_at: string | null;
  finished_at: string | null;
}

/** One `usage_log` row for today's edition. */
export interface UsageLogRow {
  cost_eur: number;
}

export interface CategoryArticleCount {
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  count: number;
}

export interface StepDuration {
  kind: string;
  /** average finished_at − started_at in seconds across this kind's measurable runs; null when none finished */
  avgSeconds: number | null;
  /** how many runs of this kind had both a started_at and a finished_at */
  count: number;
}

export interface TodayPipelineReport {
  articlesByCategory: CategoryArticleCount[];
  articleCount: number;
  sourceCount: number;
  costEur: number;
  solArticleCount: number;
  deepResearchCount: number;
  stepDurations: StepDuration[];
}

/**
 * Aggregate today's edition detail from its plain rows: article count by
 * category (sorted busiest-first), distinct source count, total € cost, Sol
 * article count, deep-research count, and average per-kind step duration.
 * Pure — no ordering assumed on any input array; empty inputs yield a
 * zeroed report.
 */
export function computeTodayReport(
  items: PipelineItemRow[],
  steps: PipelineStepRow[],
  usage: UsageLogRow[],
): TodayPipelineReport {
  const byCategory = new Map<string, CategoryArticleCount>();
  for (const item of items) {
    const key = item.category_id ?? "__none__";
    const existing = byCategory.get(key);
    if (existing) {
      existing.count++;
    } else {
      byCategory.set(key, {
        category_id: item.category_id,
        category_slug: item.category_slug,
        category_name: item.category_name,
        count: 1,
      });
    }
  }

  const sourceIds = new Set(
    items.map((item) => item.source_id).filter((id): id is string => Boolean(id)),
  );
  const costEur = usage.reduce((sum, row) => sum + row.cost_eur, 0);
  const solArticleCount = items.filter((item) => item.sol_note != null).length;
  const deepResearchCount = items.filter((item) => item.band === "deep" && item.has_article).length;

  const durationsByKind = new Map<string, number[]>();
  const seenKinds: string[] = [];
  for (const step of steps) {
    if (!durationsByKind.has(step.kind)) {
      durationsByKind.set(step.kind, []);
      seenKinds.push(step.kind);
    }
    if (!step.started_at || !step.finished_at) continue;
    const ms = Date.parse(step.finished_at) - Date.parse(step.started_at);
    if (!Number.isFinite(ms) || ms < 0) continue;
    durationsByKind.get(step.kind)!.push(ms / 1000);
  }
  const stepDurations: StepDuration[] = seenKinds.map((kind) => {
    const durations = durationsByKind.get(kind)!;
    return {
      kind,
      avgSeconds: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      count: durations.length,
    };
  });

  return {
    articlesByCategory: [...byCategory.values()].sort((a, b) => b.count - a.count),
    articleCount: items.length,
    sourceCount: sourceIds.size,
    costEur,
    solArticleCount,
    deepResearchCount,
    stepDurations,
  };
}

// ============================================================
// Trends (per-edition € cost + article count, last 7/30 editions)
// ============================================================

export interface EditionRow {
  id: string;
  date: string;
}

export interface EditionUsageRow {
  edition_id: string | null;
  cost_eur: number;
}

export interface EditionItemCountRow {
  edition_id: string;
}

export interface EditionAgg {
  edition_id: string;
  date: string;
  costEur: number;
  articleCount: number;
}

export interface PipelineTrends {
  last7: EditionAgg[];
  last30: EditionAgg[];
}

/**
 * Aggregate € cost and article count per edition, then slice to the last 7
 * and last 30 editions by date ascending (oldest first, so a trend line
 * reads left→right chronologically). `editions` need not be pre-sorted or
 * pre-limited — pass whichever window you have; the slice happens here.
 */
export function computePipelineTrends(
  editions: EditionRow[],
  usage: EditionUsageRow[],
  items: EditionItemCountRow[],
): PipelineTrends {
  const costByEdition = new Map<string, number>();
  for (const row of usage) {
    if (!row.edition_id) continue;
    costByEdition.set(row.edition_id, (costByEdition.get(row.edition_id) ?? 0) + row.cost_eur);
  }
  const countByEdition = new Map<string, number>();
  for (const row of items) {
    countByEdition.set(row.edition_id, (countByEdition.get(row.edition_id) ?? 0) + 1);
  }

  const series: EditionAgg[] = editions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((edition) => ({
      edition_id: edition.id,
      date: edition.date,
      costEur: costByEdition.get(edition.id) ?? 0,
      articleCount: countByEdition.get(edition.id) ?? 0,
    }));

  return {
    last7: series.slice(-7),
    last30: series.slice(-30),
  };
}
