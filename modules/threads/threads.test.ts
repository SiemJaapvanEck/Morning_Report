import { describe, it, expect } from "vitest";
import {
  normalizeEntity,
  entityOverlap,
  matchThread,
  computeDelta,
  dedupeEntities,
  mergeEntities,
  selectLenses,
  dominantLens,
  orderThreads,
  clusterByEntities,
  planThreadActions,
  detectAnchors,
  assignMegaThreads,
  type ThreadCandidate,
  type EntityDays,
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

describe("planThreadActions", () => {
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

  const cfg = { matchMinOverlap: 0.34, bigTopicMinOverlap: 0.3, bigTopicMinCluster: 3 };
  const noFollow = new Set<string>();

  it("links an overlapping item to an existing thread, opens nothing", () => {
    const threads = [{ id: "t1", entities: ["spacex", "ipo"], topic_id: "tech" }];
    const out = planThreadActions(
      [cand("i1", ["SpaceX", "IPO"])],
      threads,
      new Set(),
      noFollow,
      noFollow,
      cfg,
    );
    expect(out.links).toEqual([{ itemId: "i1", threadId: "t1" }]);
    expect(out.newThreads).toEqual([]);
  });

  it("opens a thread for a followed-topic item that is ALSO deep (significant)", () => {
    const out = planThreadActions(
      [cand("i1", ["Tibet"], { topicId: "tibet", deep: true })],
      [],
      new Set(),
      new Set(["tibet"]),
      noFollow,
      cfg,
    );
    expect(out.links).toEqual([]);
    expect(out.newThreads).toHaveLength(1);
    expect(out.newThreads[0]).toMatchObject({ reason: "followed", memberItemIds: ["i1"] });
  });

  it("leaves a followed but NON-deep item as a plain item (no thread explosion)", () => {
    const out = planThreadActions(
      [cand("i1", ["Tibet"], { topicId: "tibet", deep: false })],
      [],
      new Set(),
      new Set(["tibet"]),
      noFollow,
      cfg,
    );
    expect(out.links).toEqual([]);
    expect(out.newThreads).toEqual([]);
  });

  it("leaves an ordinary non-followed lone item as a plain item", () => {
    const out = planThreadActions(
      [cand("i1", ["Some Company"], { deep: true })],
      [],
      new Set(),
      noFollow,
      noFollow,
      cfg,
    );
    expect(out.links).toEqual([]);
    expect(out.newThreads).toEqual([]);
  });

  it("opens ONE big-topic thread for a cross-source cluster, even unfollowed", () => {
    const items = ["i1", "i2", "i3"].map((id, n) =>
      cand(id, ["Iran", "Israel"], { importance: n === 1 ? 0.9 : 0.4, title: `T${id}` }),
    );
    const out = planThreadActions(items, [], new Set(), noFollow, noFollow, cfg);
    expect(out.newThreads).toHaveLength(1);
    expect(out.newThreads[0].reason).toBe("big_topic");
    expect(out.newThreads[0].memberItemIds.sort()).toEqual(["i1", "i2", "i3"]);
    // seeded from the highest-importance member (i2)
    expect(out.newThreads[0].seedTitle).toBe("Ti2");
  });

  it("pulls a straggler into a thread opened the same run, and a re-run is a no-op", () => {
    const items = [
      cand("a", ["Tibet", "Dalai Lama"], { topicId: "tibet", deep: true }), // opens a thread
      cand("b", ["Tibet", "Dalai Lama"]), // not followed, not deep — but overlaps a's new thread
    ];
    const out = planThreadActions(items, [], new Set(), new Set(["tibet"]), noFollow, cfg);
    expect(out.newThreads).toHaveLength(1);
    expect(out.newThreads[0].memberItemIds.sort()).toEqual(["a", "b"]);

    // re-run with both already linked → nothing further (idempotent)
    const rerun = planThreadActions(items, [], new Set(["a", "b"]), new Set(["tibet"]), noFollow, cfg);
    expect(rerun.links).toEqual([]);
    expect(rerun.newThreads).toEqual([]);
  });

  it("skips items already linked this edition (idempotency)", () => {
    const threads = [{ id: "t1", entities: ["spacex"], topic_id: null }];
    const out = planThreadActions(
      [cand("i1", ["SpaceX"])],
      threads,
      new Set(["i1"]),
      noFollow,
      noFollow,
      cfg,
    );
    expect(out.links).toEqual([]);
    expect(out.newThreads).toEqual([]);
  });
});

describe("detectAnchors", () => {
  it("flags entities recurring on >= minDays distinct days, with a display form", () => {
    const ed: EntityDays = new Map([
      ["iran", { days: new Set(["2026-06-15", "2026-06-16", "2026-06-17"]), display: "Iran" }],
      ["blip", { days: new Set(["2026-06-17"]), display: "Blip" }],
    ]);
    const out = detectAnchors(ed, 3);
    expect(out).toEqual([{ entity: "iran", display: "Iran" }]);
  });

  it("nothing qualifies below the recurrence bar", () => {
    const ed: EntityDays = new Map([["x", { days: new Set(["d1", "d2"]), display: "X" }]]);
    expect(detectAnchors(ed, 3)).toEqual([]);
  });
});

describe("assignMegaThreads", () => {
  const t = (id: string, entities: string[], anchor: string | null = null) => ({
    id,
    entities,
    anchor_entity: anchor,
  });
  const anchors = [
    { entity: "iran", display: "Iran" },
    { entity: "us", display: "US" },
  ];

  it("assigns each child to its biggest matching anchor (not split across megas)", () => {
    const threads = [
      t("a", ["Iran", "US"]), // matches both → goes to the bigger (iran)
      t("b", ["Iran"]),
      t("c", ["Iran", "nuclear"]),
      t("d", ["US"]),
      t("mega", ["iran"], "iran"), // a mega itself is never absorbed
    ];
    const out = assignMegaThreads(anchors, threads, 3);
    expect(out).toHaveLength(1);
    expect(out[0].entity).toBe("iran");
    expect(out[0].childIds.sort()).toEqual(["a", "b", "c"]);
  });

  it("drops anchors below the minChildren bar", () => {
    const threads = [t("a", ["Iran"]), t("b", ["Iran"])];
    expect(assignMegaThreads(anchors, threads, 3)).toEqual([]);
  });
});
