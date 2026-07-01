import { describe, it, expect } from "vitest";
import {
  spanDays,
  sortStories,
  updatedAgo,
  categoryColor,
  recencyTier,
  timelinePositions,
  eventHeat,
  rankRelated,
} from "./stories";
import { entityOverlap } from "../../modules/threads";
import type { Story } from "./queries";

// Minimal Story stub — only the fields each helper reads matter.
function story(p: Partial<Story> & { id: string }): Story {
  return {
    id: p.id,
    title: p.title ?? p.id,
    category: p.category ?? null,
    categories: p.categories ?? (p.category ? [p.category] : []),
    recency: p.recency ?? "dormant",
    status: p.status ?? "active",
    firstDate: p.firstDate ?? null,
    lastDate: p.lastDate ?? null,
    eventCount: p.eventCount ?? 0,
    lastSeenAt: p.lastSeenAt ?? null,
    updatedLabel: p.updatedLabel ?? "—",
    followed: p.followed ?? false,
    events: p.events ?? [],
  };
}

describe("spanDays", () => {
  it("counts whole days between first and last event", () => {
    expect(spanDays(story({ id: "a", firstDate: "2026-06-01", lastDate: "2026-06-10" }))).toBe(9);
  });
  it("is 0 for a single-date or undated story", () => {
    expect(spanDays(story({ id: "a", firstDate: "2026-06-01", lastDate: "2026-06-01" }))).toBe(0);
    expect(spanDays(story({ id: "b" }))).toBe(0);
  });
});

describe("sortStories", () => {
  const a = story({ id: "a", title: "A", lastSeenAt: "2026-06-29T08:00:00Z", firstDate: "2026-06-20", lastDate: "2026-06-29", eventCount: 2 });
  const b = story({ id: "b", title: "B", lastSeenAt: "2026-06-29T10:00:00Z", firstDate: "2026-01-01", lastDate: "2026-06-29", eventCount: 5 });
  const c = story({ id: "c", title: "C", lastSeenAt: "2026-06-28T10:00:00Z", firstDate: "2026-05-01", lastDate: "2026-06-10", eventCount: 9 });

  it("latest orders by last-updated desc", () => {
    expect(sortStories([a, b, c], "latest").map((s) => s.id)).toEqual(["b", "a", "c"]);
  });
  it("longest orders by day-span desc", () => {
    expect(sortStories([a, b, c], "longest").map((s) => s.id)).toEqual(["b", "c", "a"]);
  });
  it("active orders by event count desc", () => {
    expect(sortStories([a, b, c], "active").map((s) => s.id)).toEqual(["c", "b", "a"]);
  });
  it("does not mutate the input array", () => {
    const input = [a, b, c];
    sortStories(input, "active");
    expect(input.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
});

describe("updatedAgo", () => {
  const now = Date.parse("2026-06-29T12:00:00Z");
  it("formats the compact age", () => {
    expect(updatedAgo("2026-06-29T11:59:30Z", now)).toBe("nu");
    expect(updatedAgo("2026-06-29T11:55:00Z", now)).toBe("5m");
    expect(updatedAgo("2026-06-29T10:00:00Z", now)).toBe("2u");
    expect(updatedAgo("2026-06-26T12:00:00Z", now)).toBe("3d");
  });
  it("returns a dash for missing/invalid input", () => {
    expect(updatedAgo(null, now)).toBe("—");
    expect(updatedAgo("not-a-date", now)).toBe("—");
  });
});

describe("categoryColor", () => {
  it("maps known slugs and falls back for unknown/missing", () => {
    expect(categoryColor("tech")).toBe("#7c3aed");
    expect(categoryColor("frontier")).toBe("#16a34a");
    expect(categoryColor("nonsense")).toBe("#78716c");
    expect(categoryColor(null)).toBe("#78716c");
  });
});

describe("recencyTier", () => {
  const now = Date.parse("2026-06-30T12:00:00Z");
  it("buckets by last-event age", () => {
    expect(recencyTier("2026-06-29T12:00:00Z", now)).toBe("live"); // 1d
    expect(recencyTier("2026-06-28T18:00:00Z", now)).toBe("live"); // 1.75d
    expect(recencyTier("2026-06-27T00:00:00Z", now)).toBe("week"); // 3.5d
    expect(recencyTier("2026-06-25T12:00:00Z", now)).toBe("week"); // 5d
    expect(recencyTier("2026-06-10T12:00:00Z", now)).toBe("dormant"); // 20d
  });
  it("treats missing/invalid dates as dormant", () => {
    expect(recencyTier(null, now)).toBe("dormant");
    expect(recencyTier("not-a-date", now)).toBe("dormant");
  });
});

describe("timelinePositions", () => {
  it("maps dates to 0..100 between first and last", () => {
    expect(timelinePositions(["2026-06-01", "2026-06-06", "2026-06-11"])).toEqual([0, 50, 100]);
  });
  it("preserves input order regardless of chronology", () => {
    expect(timelinePositions(["2026-06-11", "2026-06-01"])).toEqual([100, 0]);
  });
  it("puts a single or zero-span story at 0", () => {
    expect(timelinePositions(["2026-06-01"])).toEqual([0]);
    expect(timelinePositions(["2026-06-01", "2026-06-01"])).toEqual([0, 0]);
  });
  it("returns all-zero for empty/undated input", () => {
    expect(timelinePositions([])).toEqual([]);
    expect(timelinePositions(["", ""])).toEqual([0, 0]);
  });
});

describe("eventHeat", () => {
  it("counts events into equal-width bins across the span", () => {
    const heat = eventHeat(["2026-06-01", "2026-06-02", "2026-06-10"], 2);
    expect(heat).toHaveLength(2);
    expect(heat[0]).toBe(2);
    expect(heat[1]).toBe(1);
    expect(heat.reduce((a, b) => a + b, 0)).toBe(3);
  });
  it("returns all-zero bins for empty input", () => {
    expect(eventHeat([], 4)).toEqual([0, 0, 0, 0]);
  });
  it("puts a single-day story in the last bin", () => {
    expect(eventHeat(["2026-06-01", "2026-06-01"], 3)).toEqual([0, 0, 2]);
  });
});

describe("rankRelated", () => {
  const others = [
    { id: "a", entities: ["trump", "china"] },
    { id: "b", entities: ["spacex", "nasa"] },
    { id: "c", entities: ["trump", "eu"] },
  ];
  it("ranks by overlap desc and drops zero-overlap candidates", () => {
    const ranked = rankRelated(["trump", "china"], others, entityOverlap);
    expect(ranked.map((r) => r.item.id)).toEqual(["a", "c"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
  it("honors the limit", () => {
    expect(rankRelated(["trump"], others, entityOverlap, 1).map((r) => r.item.id)).toEqual(["a"]);
  });
});
