import { describe, it, expect } from "vitest";
import {
  normalizeEntity,
  entityOverlap,
  computeDelta,
  dedupeEntities,
  mergeEntities,
  selectLenses,
  dominantLens,
  orderThreads,
  clusterByEntities,
  primaryEntity,
  dominantEntity,
  bigTopicAnchors,
  personalAnchors,
  mergeAnchors,
  matchByAnchor,
  resolveThreadMeta,
  detectAnchors,
  type ThreadCandidate,
  type AnchorSpec,
  type EntityDays,
} from "./index";

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

describe("dominantLens", () => {
  it("picks the mode of the stories' primary lenses", () => {
    expect(
      dominantLens([["politiek"], ["politiek", "economisch"], ["economisch"]]),
    ).toBe("politiek");
  });

  it("tie-breaks by LENS_ORDER (economisch before politiek)", () => {
    expect(dominantLens([["politiek"], ["economisch"]])).toBe("economisch");
  });

  it("ignores empty story lens lists and falls back to sociaal", () => {
    expect(dominantLens([[], []])).toBe("sociaal");
    expect(dominantLens([])).toBe("sociaal");
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

describe("clusterByEntities", () => {
  const it_ = (id: string, entities: string[]) => ({ id, entities });

  it("groups items that share entities and drops singletons below minSize", () => {
    const clusters = clusterByEntities(
      [
        it_("a", ["Iran", "Israel"]),
        it_("b", ["Iran", "Israel", "Tehran"]),
        it_("c", ["SpaceX", "NASA"]),
      ],
      0.3,
      2,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].sort()).toEqual(["a", "b"]);
  });

  it("links transitively (A~B, B~C ⇒ one cluster even if A and C barely overlap)", () => {
    const clusters = clusterByEntities(
      [
        it_("a", ["Iran", "Israel"]),
        it_("b", ["Israel", "Gaza"]),
        it_("c", ["Gaza", "UN"]),
      ],
      0.3,
      3,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].sort()).toEqual(["a", "b", "c"]);
  });

  it("respects minSize — a 4-item story does not trip a threshold of 5", () => {
    const items = ["a", "b", "c", "d"].map((id) => it_(id, ["Iran", "Israel"]));
    expect(clusterByEntities(items, 0.3, 5)).toEqual([]);
    expect(clusterByEntities(items, 0.3, 4)).toHaveLength(1);
  });

  it("items without entities never cluster", () => {
    expect(clusterByEntities([it_("a", []), it_("b", [])], 0.3, 2)).toEqual([]);
  });
});

const cand = (
  itemId: string,
  entities: string[],
  extra: Partial<ThreadCandidate> = {},
): ThreadCandidate => ({
  itemId,
  title: `Item ${itemId}`,
  topicId: null,
  categoryId: null,
  entities,
  importance: null,
  deep: false,
  ...extra,
});

describe("primaryEntity", () => {
  it("returns the first usable entity, normalized + display", () => {
    expect(primaryEntity(["SpaceX", "NASA"])).toEqual({ entity: "spacex", display: "SpaceX" });
  });

  it("skips blank entries and returns null when none are usable", () => {
    expect(primaryEntity(["", "  "])).toBeNull();
    expect(primaryEntity([])).toBeNull();
  });
});

describe("dominantEntity", () => {
  it("picks the most frequent normalized entity with a display form", () => {
    const out = dominantEntity([
      { entities: ["Iran", "Israel"] },
      { entities: ["Iran", "Tehran"] },
      { entities: ["Israel"] },
    ]);
    expect(out).toEqual({ entity: "iran", display: "Iran" });
  });

  it("ties break toward the entity seen first", () => {
    expect(dominantEntity([{ entities: ["Ford", "Tesla"] }])).toEqual({ entity: "ford", display: "Ford" });
  });

  it("no entities → null", () => {
    expect(dominantEntity([{ entities: [] }])).toBeNull();
  });
});

describe("bigTopicAnchors", () => {
  it("a cross-source cluster yields its dominant entity as a big_topic anchor", () => {
    const items = ["i1", "i2", "i3"].map((id) => ({ id, entities: ["Iran", "Israel"] }));
    const out = bigTopicAnchors(items, 0.3, 3);
    expect(out).toEqual([{ entity: "iran", display: "Iran", reason: "big_topic" }]);
  });

  it("a cluster below minCluster yields nothing", () => {
    const items = ["i1", "i2"].map((id) => ({ id, entities: ["Iran", "Israel"] }));
    expect(bigTopicAnchors(items, 0.3, 3)).toEqual([]);
  });
});

describe("personalAnchors", () => {
  const noset = new Set<string>();

  it("a followed + deep item anchors on its primary entity", () => {
    const out = personalAnchors(
      [cand("i1", ["Tibet", "Lhasa"], { topicId: "tibet", deep: true })],
      new Set(["tibet"]),
      noset,
      noset,
    );
    expect(out).toEqual([{ entity: "tibet", display: "Tibet", reason: "followed" }]);
  });

  it("a followed but NON-deep item yields no anchor", () => {
    const out = personalAnchors(
      [cand("i1", ["Tibet"], { topicId: "tibet", deep: false })],
      new Set(["tibet"]),
      noset,
      noset,
    );
    expect(out).toEqual([]);
  });

  it("a tracked topic anchors regardless of follow or deep band", () => {
    const out = personalAnchors(
      [cand("i1", ["Acme Corp"], { topicId: "ma-deals", deep: false })],
      noset,
      noset,
      new Set(["ma-deals"]),
    );
    expect(out).toEqual([{ entity: "acme corp", display: "Acme Corp", reason: "tracked" }]);
  });
});

describe("mergeAnchors", () => {
  it("dedupes by entity, highest-priority reason wins", () => {
    const recurring: AnchorSpec[] = [{ entity: "iran", display: "Iran", reason: "recurring" }];
    const big: AnchorSpec[] = [{ entity: "iran", display: "IRAN", reason: "big_topic" }];
    const tracked: AnchorSpec[] = [{ entity: "ford", display: "Ford", reason: "tracked" }];
    const out = mergeAnchors(big, recurring, tracked);
    expect(out).toContainEqual({ entity: "iran", display: "Iran", reason: "recurring" });
    expect(out).toContainEqual({ entity: "ford", display: "Ford", reason: "tracked" });
    expect(out).toHaveLength(2);
  });
});

describe("matchByAnchor", () => {
  const threads = [
    { id: "t-iran", anchor_entity: "iran" },
    { id: "t-ford", anchor_entity: "ford" },
    { id: "t-null", anchor_entity: null },
  ];

  it("links an item to the thread whose anchor it contains", () => {
    expect(matchByAnchor(["Iran", "Tehran"], threads)).toBe("t-iran");
  });

  it("prefers the anchor that is the more salient (earlier) entity", () => {
    // Ford comes before Iran in the item's entity list → t-ford wins
    expect(matchByAnchor(["Ford", "Iran"], threads)).toBe("t-ford");
  });

  it("returns null when no anchor is contained", () => {
    expect(matchByAnchor(["Tesla"], threads)).toBeNull();
  });

  it("never matches a null-anchor thread", () => {
    expect(matchByAnchor(["Whatever"], [{ id: "t-null", anchor_entity: null }])).toBeNull();
  });
});

describe("resolveThreadMeta", () => {
  it("picks the most common non-null topic/category among items carrying the anchor", () => {
    const out = resolveThreadMeta("iran", [
      cand("i1", ["Iran"], { topicId: "conflict", categoryId: "wereld" }),
      cand("i2", ["Iran", "Israel"], { topicId: "conflict", categoryId: "wereld" }),
      cand("i3", ["Tesla"], { topicId: "markten", categoryId: "financieel" }), // no anchor → ignored
    ]);
    expect(out).toEqual({ topicId: "conflict", categoryId: "wereld" });
  });

  it("returns nulls when no item carries the anchor", () => {
    expect(resolveThreadMeta("iran", [cand("i1", ["Tesla"])])).toEqual({ topicId: null, categoryId: null });
  });
});

describe("detectAnchors", () => {
  it("flags entities recurring on >= minDays distinct days AND >= minItems items", () => {
    const ed: EntityDays = new Map([
      ["iran", { days: new Set(["2026-06-15", "2026-06-16", "2026-06-17"]), count: 6, display: "Iran" }],
      ["blip", { days: new Set(["2026-06-17"]), count: 1, display: "Blip" }],
    ]);
    const out = detectAnchors(ed, 3, 5);
    expect(out).toEqual([{ entity: "iran", display: "Iran" }]);
  });

  it("nothing qualifies below the recurrence bar", () => {
    const ed: EntityDays = new Map([["x", { days: new Set(["d1", "d2"]), count: 9, display: "X" }]]);
    expect(detectAnchors(ed, 3, 5)).toEqual([]);
  });

  it("the volume floor drops a thin one-off that recurs across enough days", () => {
    // 3 distinct days but only 3 mentions — a stray dateline, not a story.
    const ed: EntityDays = new Map([
      ["jena university", { days: new Set(["d1", "d2", "d3"]), count: 3, display: "Jena University" }],
    ]);
    expect(detectAnchors(ed, 3, 5)).toEqual([]);
  });
});

