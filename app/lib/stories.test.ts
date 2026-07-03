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
  dailyActivitySeries,
  seriesPoints,
  lineWeight,
  threadSubject,
  titleCaseEntity,
  buildStorylineTimeline,
  storyGeography,
  type TimelineLink,
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
    isUmbrella: p.isUmbrella ?? false,
    storylineCount: p.storylineCount ?? 0,
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

describe("dailyActivitySeries", () => {
  it("counts events per day across an inclusive window", () => {
    expect(
      dailyActivitySeries(["2026-06-01", "2026-06-01", "2026-06-03"], "2026-06-01", "2026-06-03"),
    ).toEqual([2, 0, 1]);
  });
  it("ignores events outside the window and unparseable dates", () => {
    expect(
      dailyActivitySeries(["2026-05-30", "2026-06-02", "", "nope"], "2026-06-01", "2026-06-03"),
    ).toEqual([0, 1, 0]);
  });
  it("returns [] for an inverted or invalid window", () => {
    expect(dailyActivitySeries(["2026-06-02"], "2026-06-03", "2026-06-01")).toEqual([]);
    expect(dailyActivitySeries(["2026-06-02"], "bad", "2026-06-03")).toEqual([]);
  });
  it("length is span + 1", () => {
    expect(dailyActivitySeries([], "2026-06-01", "2026-06-05")).toHaveLength(5);
  });
});

describe("seriesPoints", () => {
  it("spreads x evenly 0..100 and scales y to the busiest day", () => {
    const pts = seriesPoints([1, 0, 2], 2);
    expect(pts.map((p) => p.x)).toEqual([0, 50, 100]);
    expect(pts.map((p) => p.y)).toEqual([50, 0, 100]);
    expect(pts.map((p) => p.value)).toEqual([1, 0, 2]);
  });
  it("puts a single-day series at x 0", () => {
    expect(seriesPoints([3], 3)).toEqual([{ x: 0, y: 100, value: 3 }]);
  });
  it("flattens y to 0 when maxActivity <= 0", () => {
    expect(seriesPoints([0, 0], 0).map((p) => p.y)).toEqual([0, 0]);
  });
});

describe("lineWeight", () => {
  it("draws live lines heavier than week, week heavier than dormant", () => {
    expect(lineWeight("live")).toBeGreaterThan(lineWeight("week"));
    expect(lineWeight("week")).toBeGreaterThan(lineWeight("dormant"));
  });
});

describe("titleCaseEntity", () => {
  it("capitalizes each word", () => {
    expect(titleCaseEntity("nasdaq 100")).toBe("Nasdaq 100");
    expect(titleCaseEntity("anthropic")).toBe("Anthropic");
  });
});

describe("threadSubject", () => {
  it("keeps an already-short subject title with its exact casing", () => {
    expect(threadSubject("SpaceX", "spacex")).toBe("SpaceX");
    expect(threadSubject("PlayStation", "playstation")).toBe("PlayStation");
  });
  it("shortens a full-sentence title to the title-cased anchor", () => {
    expect(
      threadSubject("Anthropic lanceert Claude Science als workflow-tool en krijgt toegang", "anthropic"),
    ).toBe("Anthropic");
  });
  it("falls back to the leading words when there is no anchor", () => {
    expect(threadSubject("Iran verkoopt olie met 20% premie na einde blokkade", null)).toBe("Iran verkoopt olie");
  });
});

// ── buildStorylineTimeline (A3 Phase 2) ──────────────────────────────────────

function link(overrides: Partial<TimelineLink> & { edition_id: string; date: string }): TimelineLink {
  return {
    item_id: overrides.edition_id + "-item",
    title: overrides.title ?? `Artikel ${overrides.edition_id}`,
    source: overrides.source ?? null,
    ...overrides,
  };
}

const TODAY = "2026-07-02";

describe("buildStorylineTimeline", () => {
  it("returns [] for empty links", () => {
    expect(buildStorylineTimeline([], TODAY, null)).toEqual([]);
  });

  it("returns a single past node for one link", () => {
    const nodes = buildStorylineTimeline([link({ edition_id: "e1", date: "2026-06-10" })], TODAY, null);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ kind: "past", deel: 1, isNow: true });
  });

  it("excludes links after today", () => {
    const nodes = buildStorylineTimeline(
      [
        link({ edition_id: "e1", date: "2026-06-10" }),
        link({ edition_id: "e2", date: "2026-07-10" }),
      ],
      TODAY,
      null,
    );
    expect(nodes).toHaveLength(1);
    expect((nodes[0] as { date: string }).date).toBe("2026-06-10");
  });

  it("deduplicates links from the same edition", () => {
    const nodes = buildStorylineTimeline(
      [
        link({ edition_id: "e1", date: "2026-06-10", title: "First" }),
        link({ edition_id: "e1", date: "2026-06-10", title: "Second" }),
      ],
      TODAY,
      null,
    );
    expect(nodes).toHaveLength(1);
    expect((nodes[0] as { title: string }).title).toBe("First");
  });

  it("orders past nodes ascending by date", () => {
    const nodes = buildStorylineTimeline(
      [
        link({ edition_id: "e2", date: "2026-06-15" }),
        link({ edition_id: "e1", date: "2026-06-01" }),
        link({ edition_id: "e3", date: "2026-06-30" }),
      ],
      TODAY,
      null,
    );
    const dates = nodes.map((n) => n.date);
    expect(dates).toEqual(["2026-06-01", "2026-06-15", "2026-06-30"]);
  });

  it("numbers deel from 1 in chronological order", () => {
    const nodes = buildStorylineTimeline(
      [
        link({ edition_id: "e2", date: "2026-06-15" }),
        link({ edition_id: "e1", date: "2026-06-01" }),
      ],
      TODAY,
      null,
    );
    expect(nodes[0]).toMatchObject({ kind: "past", deel: 1 });
    expect(nodes[1]).toMatchObject({ kind: "past", deel: 2 });
  });

  it("marks only the latest past node as isNow", () => {
    const nodes = buildStorylineTimeline(
      [
        link({ edition_id: "e1", date: "2026-06-01" }),
        link({ edition_id: "e2", date: "2026-06-15" }),
        link({ edition_id: "e3", date: "2026-07-01" }),
      ],
      TODAY,
      null,
    );
    const pastNodes = nodes.filter((n) => n.kind === "past") as { isNow: boolean }[];
    expect(pastNodes[0].isNow).toBe(false);
    expect(pastNodes[1].isNow).toBe(false);
    expect(pastNodes[2].isNow).toBe(true);
  });

  it("appends a future node when prediction is given", () => {
    const prediction = {
      text: "Dit zal gebeuren",
      target_date: "2026-08-01",
      confidence: "verwacht" as const,
      source_basis: "basis",
    };
    const nodes = buildStorylineTimeline(
      [link({ edition_id: "e1", date: "2026-06-01" })],
      TODAY,
      prediction,
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toMatchObject({
      kind: "future",
      date: "2026-08-01",
      text: "Dit zal gebeuren",
      certainty: "verwacht",
    });
  });

  it("includes no future node when prediction is null", () => {
    const nodes = buildStorylineTimeline(
      [link({ edition_id: "e1", date: "2026-06-01" })],
      TODAY,
      null,
    );
    expect(nodes.every((n) => n.kind === "past")).toBe(true);
  });

  it("returns [] (no today-only fallback) when all links are after today", () => {
    const nodes = buildStorylineTimeline(
      [link({ edition_id: "e1", date: "2026-07-10" })],
      TODAY,
      null,
    );
    expect(nodes).toEqual([]);
  });
});

// ── storyGeography (A3 Phase 3) ───────────────────────────────────────────────

describe("storyGeography", () => {
  it("returns empty counts and chips for null regio and no place entities", () => {
    const result = storyGeography(null, []);
    expect(result).toEqual({ counts: {}, chips: [] });
  });

  it("maps a valid regio to counts with weight 1", () => {
    const result = storyGeography("eu", []);
    expect(result.counts).toEqual({ eu: 1 });
    expect(result.chips).toEqual([]);
  });

  it("ignores unknown regio gracefully", () => {
    const result = storyGeography("xyz", []);
    expect(result.counts).toEqual({});
  });

  it("returns empty counts when regio is null", () => {
    const result = storyGeography(null, ["Amsterdam", "Rotterdam"]);
    expect(result.counts).toEqual({});
    expect(result.chips).toHaveLength(2);
  });

  it("title-cases place entity names in chips", () => {
    const result = storyGeography(null, ["amsterdam", "new york"]);
    expect(result.chips).toEqual(["Amsterdam", "New York"]);
  });

  it("de-dupes place entities case-insensitively", () => {
    const result = storyGeography(null, ["Amsterdam", "amsterdam", "AMSTERDAM"]);
    expect(result.chips).toHaveLength(1);
    expect(result.chips[0]).toBe("Amsterdam");
  });

  it("caps chips at 6", () => {
    const places = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const result = storyGeography("na", places);
    expect(result.chips).toHaveLength(6);
    expect(result.chips).not.toContain("G");
  });

  it("handles both regio and place entities together", () => {
    const result = storyGeography("ap", ["Tokyo", "Seoul"]);
    expect(result.counts).toEqual({ ap: 1 });
    expect(result.chips).toEqual(["Tokyo", "Seoul"]);
  });

  it("skips empty strings in place entities", () => {
    const result = storyGeography(null, ["", "Paris", ""]);
    expect(result.chips).toEqual(["Paris"]);
  });
});
