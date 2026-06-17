import { describe, it, expect } from "vitest";
import {
  normalizeEntity,
  entityOverlap,
  matchThread,
  computeDelta,
  dedupeEntities,
  mergeEntities,
  selectLenses,
  orderThreads,
} from "./index";
import type { Thread } from "../shared/types";

// Minimal thread factory for matchThread (only the picked fields matter).
const thread = (
  id: string,
  entities: string[],
  topic_id: string | null = null,
): Pick<Thread, "id" | "entities" | "topic_id"> => ({ id, entities, topic_id });

describe("normalizeEntity", () => {
  it("lowercases, trims and folds punctuation to spaces", () => {
    expect(normalizeEntity("  SpaceX!! ")).toBe("spacex");
    expect(normalizeEntity("U.S. Federal Reserve")).toBe("u s federal reserve");
  });

  it("strips diacritics", () => {
    expect(normalizeEntity("São Paulo")).toBe("sao paulo");
    expect(normalizeEntity("Café")).toBe("cafe");
  });

  it("collapses whitespace", () => {
    expect(normalizeEntity("OpenAI   Inc")).toBe("openai inc");
  });
});

describe("entityOverlap", () => {
  it("disjoint sets → 0", () => {
    expect(entityOverlap(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("identical sets → 1", () => {
    expect(entityOverlap(["a", "b"], ["b", "a"])).toBe(1);
  });

  it("partial overlap is Jaccard", () => {
    // {a,b,c} ∩ {b,c,d} = {b,c} (2), ∪ = {a,b,c,d} (4) → 0.5
    expect(entityOverlap(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(0.5);
  });

  it("empty either side → 0", () => {
    expect(entityOverlap([], ["a"])).toBe(0);
    expect(entityOverlap(["a"], [])).toBe(0);
  });
});

describe("matchThread", () => {
  const threads = [
    thread("t1", ["spacex", "ipo", "nasdaq"], "tech"),
    thread("t2", ["fed", "rente", "inflatie"], "finance"),
  ];

  it("matches the thread with highest entity overlap", () => {
    const m = matchThread(["spacex", "ipo"], "tech", threads);
    expect(m?.threadId).toBe("t1");
    expect(m?.score).toBeGreaterThan(0.34);
  });

  it("returns null below the overlap threshold", () => {
    expect(matchThread(["tesla"], null, threads)).toBeNull();
  });

  it("returns null when the item has no entities", () => {
    expect(matchThread([], "tech", threads)).toBeNull();
  });

  it("normalizes before comparing (case/diacritics)", () => {
    const m = matchThread(["SpaceX", "IPO"], "tech", threads);
    expect(m?.threadId).toBe("t1");
  });

  it("same-topic bonus breaks a tie toward the matching topic", () => {
    const tied = [
      thread("a", ["x", "y"], "topicA"),
      thread("b", ["x", "y"], "topicB"),
    ];
    // identical entity overlap on both; topic bonus should pick b
    expect(matchThread(["x", "y"], "topicB", tied)?.threadId).toBe("b");
  });
});

describe("computeDelta", () => {
  it("hasNews is false when every matched item is already seen", () => {
    const d = computeDelta(
      { entities: ["spacex"] },
      [{ id: "i1", title: "Old", entities: ["spacex"] }],
      new Set(["i1"]),
    );
    expect(d.hasNews).toBe(false);
    expect(d.newHeadlines).toEqual([]);
  });

  it("newHeadlines excludes already-seen items", () => {
    const d = computeDelta(
      { entities: [] },
      [
        { id: "i1", title: "Seen" },
        { id: "i2", title: "Fresh" },
      ],
      new Set(["i1"]),
    );
    expect(d.newHeadlines).toEqual(["Fresh"]);
    expect(d.hasNews).toBe(true);
  });

  it("newEntities excludes entities the thread already knows", () => {
    const d = computeDelta(
      { entities: ["SpaceX"] },
      [{ id: "i2", title: "Fresh", entities: ["spacex", "nasdaq"] }],
      new Set(),
    );
    expect(d.newEntities).toEqual(["nasdaq"]);
  });
});

describe("dedupeEntities", () => {
  it("keeps the human-readable display form", () => {
    expect(dedupeEntities(["SpaceX", "São Paulo"])).toEqual(["SpaceX", "São Paulo"]);
  });

  it("dedupes case/diacritic-insensitively, first display form wins", () => {
    expect(dedupeEntities(["SpaceX", "spacex", "SPACEX"])).toEqual(["SpaceX"]);
    expect(dedupeEntities(["Café", "cafe"])).toEqual(["Café"]);
  });

  it("trims and drops empty/blank entries", () => {
    expect(dedupeEntities(["  Tesla  ", "", "   "])).toEqual(["Tesla"]);
  });

  it("caps the count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Entity${i}`);
    expect(dedupeEntities(many, 8)).toHaveLength(8);
  });
});

describe("mergeEntities", () => {
  it("unions, normalizes and dedupes", () => {
    expect(mergeEntities(["SpaceX"], ["spacex", "NASDAQ"])).toEqual(["spacex", "nasdaq"]);
  });

  it("caps the result length", () => {
    const many = Array.from({ length: 50 }, (_, i) => `e${i}`);
    expect(mergeEntities([], many, 40)).toHaveLength(40);
  });
});

describe("selectLenses", () => {
  it("a tech-company IPO → economisch + technologisch only", () => {
    const lenses = selectLenses("tech", "SpaceX", ["ipo", "nasdaq"]);
    expect(lenses).toContain("economisch");
    expect(lenses).toContain("technologisch");
    expect(lenses).not.toContain("ecologisch");
  });

  it("never returns more than max lenses", () => {
    const lenses = selectLenses(null, "klimaat economie politiek onderwijs", ["energie"], 3);
    expect(lenses.length).toBeLessThanOrEqual(3);
  });

  it("falls back to a single neutral lens when nothing matches", () => {
    expect(selectLenses(null, "xyzzy", [])).toEqual(["sociaal"]);
  });
});

describe("orderThreads", () => {
  const t = (followed: boolean, deltaSize: number, id: string) => ({ followed, deltaSize, id });

  it("followed threads come first", () => {
    const ordered = orderThreads([t(false, 9, "a"), t(true, 1, "b")]);
    expect(ordered[0].id).toBe("b");
  });

  it("within a group, bigger deltas come first", () => {
    const ordered = orderThreads([t(true, 1, "a"), t(true, 5, "b")]);
    expect(ordered.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
