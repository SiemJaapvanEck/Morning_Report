import { describe, expect, it } from "vitest";
import {
  computePipelineTrends,
  computeTodayReport,
  type EditionItemCountRow,
  type EditionRow,
  type EditionUsageRow,
  type PipelineItemRow,
  type PipelineStepRow,
  type UsageLogRow,
} from "./index";

describe("computeTodayReport", () => {
  const items: PipelineItemRow[] = [
    {
      band: "deep",
      category_id: "cat-tech",
      category_slug: "tech",
      category_name: "Tech",
      source_id: "src-1",
      sol_note: "Sol vond dit relevant",
      has_article: true,
    },
    {
      band: "summary",
      category_id: "cat-tech",
      category_slug: "tech",
      category_name: "Tech",
      source_id: "src-2",
      sol_note: null,
      has_article: false,
    },
    {
      band: "headline",
      category_id: "cat-wereld",
      category_slug: "wereld",
      category_name: "Wereld",
      source_id: "src-1",
      sol_note: null,
      has_article: false,
    },
    {
      // deep band but no structured article (older/pre-Phase-1 item) — must not count as deep-research
      band: "deep",
      category_id: "cat-wereld",
      category_slug: "wereld",
      category_name: "Wereld",
      source_id: null,
      sol_note: null,
      has_article: false,
    },
  ];

  const steps: PipelineStepRow[] = [
    { kind: "ingest", started_at: "2026-07-22T05:00:00Z", finished_at: "2026-07-22T05:00:04Z" },
    { kind: "generate", started_at: "2026-07-22T05:01:00Z", finished_at: "2026-07-22T05:01:06Z" },
    { kind: "generate", started_at: "2026-07-22T05:02:00Z", finished_at: "2026-07-22T05:02:02Z" },
    // still running — no finished_at, must not count toward the average
    { kind: "finalize", started_at: "2026-07-22T05:03:00Z", finished_at: null },
  ];

  const usage: UsageLogRow[] = [{ cost_eur: 0.12 }, { cost_eur: 0.08 }];

  it("counts articles by category, busiest first", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.articlesByCategory).toEqual([
      { category_id: "cat-tech", category_slug: "tech", category_name: "Tech", count: 2 },
      { category_id: "cat-wereld", category_slug: "wereld", category_name: "Wereld", count: 2 },
    ]);
    expect(report.articleCount).toBe(4);
  });

  it("counts distinct non-null sources", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.sourceCount).toBe(2); // src-1, src-2 — the null source_id doesn't count
  });

  it("sums usage_log cost for the edition", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.costEur).toBeCloseTo(0.2);
  });

  it("counts Sol-annotated articles", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.solArticleCount).toBe(1);
  });

  it("counts deep-band items with a non-null article only", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.deepResearchCount).toBe(1); // the second "deep" row has has_article: false
  });

  it("averages finished step durations per kind, and reports 0 measured runs when none finished", () => {
    const report = computeTodayReport(items, steps, usage);
    expect(report.stepDurations).toEqual(
      expect.arrayContaining([
        { kind: "ingest", avgSeconds: 4, count: 1 },
        { kind: "generate", avgSeconds: 4, count: 2 }, // (6 + 2) / 2
        { kind: "finalize", avgSeconds: null, count: 0 },
      ]),
    );
  });

  it("returns a zeroed report for empty inputs", () => {
    const report = computeTodayReport([], [], []);
    expect(report).toEqual({
      articlesByCategory: [],
      articleCount: 0,
      sourceCount: 0,
      costEur: 0,
      solArticleCount: 0,
      deepResearchCount: 0,
      stepDurations: [],
    });
  });
});

describe("computePipelineTrends", () => {
  const editions: EditionRow[] = [
    { id: "e3", date: "2026-07-22" },
    { id: "e1", date: "2026-07-20" },
    { id: "e2", date: "2026-07-21" },
  ];
  const usage: EditionUsageRow[] = [
    { edition_id: "e1", cost_eur: 0.5 },
    { edition_id: "e1", cost_eur: 0.25 },
    { edition_id: "e2", cost_eur: 0.3 },
    { edition_id: null, cost_eur: 999 }, // orphaned usage row must not leak into any edition
  ];
  const items: EditionItemCountRow[] = [
    { edition_id: "e1" },
    { edition_id: "e1" },
    { edition_id: "e2" },
    { edition_id: "e2" },
    { edition_id: "e2" },
  ];

  it("sorts editions ascending by date and aggregates cost + article count per edition", () => {
    const trends = computePipelineTrends(editions, usage, items);
    expect(trends.last7).toEqual([
      { edition_id: "e1", date: "2026-07-20", costEur: 0.75, articleCount: 2 },
      { edition_id: "e2", date: "2026-07-21", costEur: 0.3, articleCount: 3 },
      { edition_id: "e3", date: "2026-07-22", costEur: 0, articleCount: 0 },
    ]);
  });

  it("slices to the last 30 the same way when fewer than 30 editions are given", () => {
    const trends = computePipelineTrends(editions, usage, items);
    expect(trends.last30).toEqual(trends.last7);
  });

  it("slices to the last 7/30 editions when given a longer window", () => {
    const many: EditionRow[] = Array.from({ length: 35 }, (_, i) => ({
      id: `edition-${i}`,
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    }));
    const trends = computePipelineTrends(many, [], []);
    expect(trends.last7).toHaveLength(7);
    expect(trends.last7[0].edition_id).toBe("edition-28");
    expect(trends.last7.at(-1)?.edition_id).toBe("edition-34");
    expect(trends.last30).toHaveLength(30);
    expect(trends.last30[0].edition_id).toBe("edition-5");
  });

  it("returns empty series for no editions", () => {
    const trends = computePipelineTrends([], [], []);
    expect(trends).toEqual({ last7: [], last30: [] });
  });
});
