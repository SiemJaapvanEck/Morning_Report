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
  storylineFacets,
  matchStorylines,
  shouldPromote,
  selectNextThreadJob,
  aggregateUmbrellaState,
  isAnchorableEntity,
  canAnchorUmbrella,
  canBeFacet,
  resolveEntityType,
  type ThreadCandidate,
  type ThreadJobCandidate,
  type AnchorSpec,
  type EntityDays,
} from "./index";
import { buildRegistry, type EntityRegistry } from "../entities";
import type { Entity } from "../shared/types";

describe("normalizeEntity", () => {
  it("lowercases, trims and folds punctuation to spaces", () => {
    expect(normalizeEntity("  SpaceX!! ")).toBe("spacex");
    expect(normalizeEntity("AT&T")).toBe("at t");
  });

  it("strips diacritics", () => {
    expect(normalizeEntity("São Paulo")).toBe("sao paulo");
    expect(normalizeEntity("Café")).toBe("cafe");
  });

  it("collapses whitespace", () => {
    expect(normalizeEntity("OpenAI   Inc")).toBe("openai inc");
  });

  it("folds known aliases to one canonical entity", () => {
    expect(normalizeEntity("Donald Trump")).toBe("trump");
    expect(normalizeEntity("Trump administration")).toBe("trump");
    expect(normalizeEntity("United States")).toBe("us");
    expect(normalizeEntity("U.S.")).toBe("us");
    expect(normalizeEntity("Oekraïne")).toBe("ukraine");
    expect(normalizeEntity("US Federal Reserve")).toBe("federal reserve");
  });
});

describe("isAnchorableEntity", () => {
  it("rejects bare datelines but keeps coherent place-stories", () => {
    expect(isAnchorableEntity("us")).toBe(false);
    expect(isAnchorableEntity("france")).toBe(false);
    expect(isAnchorableEntity("moscow")).toBe(false);
    expect(isAnchorableEntity("")).toBe(false);
    expect(isAnchorableEntity("israel")).toBe(true);
    expect(isAnchorableEntity("ukraine")).toBe(true);
    expect(isAnchorableEntity("trump")).toBe(true);
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

describe("storylineFacets", () => {
  const items = [
    { entities: ["Anthropic", "Fable"] },
    { entities: ["Anthropic", "Fable", "IPO"] },
    { entities: ["Anthropic", "IPO"] },
    { entities: ["Anthropic", "Microsoft"] }, // a one-off facet
  ];

  it("returns co-occurring facets meeting the item floor, big anchor excluded", () => {
    const out = storylineFacets("anthropic", items, 2);
    expect(out).toEqual([
      { entity: "fable", display: "Fable", count: 2 },
      { entity: "ipo", display: "IPO", count: 2 },
    ]);
  });

  it("keeps the display form and sorts by recurrence, ties by first-seen", () => {
    const out = storylineFacets("anthropic", items, 1);
    expect(out.map((f) => f.entity)).toEqual(["fable", "ipo", "microsoft"]);
    expect(out.find((f) => f.entity === "microsoft")).toEqual({
      entity: "microsoft",
      display: "Microsoft",
      count: 1,
    });
  });

  it("excludes other big anchors (sibling umbrellas, not sub-storylines)", () => {
    const conflict = [
      { entities: ["Iran", "Israel", "Strait of Hormuz"] },
      { entities: ["Iran", "Israel", "Strait of Hormuz"] },
    ];
    const out = storylineFacets("iran", conflict, 2, new Set(["israel"]));
    expect(out.map((f) => f.entity)).toEqual(["strait of hormuz"]);
  });

  it("dedupes a facet within one item and drops bare datelines", () => {
    const dup = [
      { entities: ["Anthropic", "Fable", "fable", "US"] },
      { entities: ["Anthropic", "Fable"] },
    ];
    const out = storylineFacets("anthropic", dup, 2);
    expect(out).toEqual([{ entity: "fable", display: "Fable", count: 2 }]);
  });
});

describe("matchStorylines", () => {
  const storylines = [
    { id: "s-fable", anchor_entity: "fable" },
    { id: "s-ipo", anchor_entity: "ipo" },
    { id: "s-null", anchor_entity: null },
  ];

  it("fans out to every facet the item carries (many-to-many)", () => {
    expect(matchStorylines(["Anthropic", "Fable", "IPO"], storylines)).toEqual(["s-fable", "s-ipo"]);
  });

  it("links only the facets present", () => {
    expect(matchStorylines(["Anthropic", "Fable"], storylines)).toEqual(["s-fable"]);
  });

  it("no facet match → no storyline links", () => {
    expect(matchStorylines(["Anthropic", "Microsoft"], storylines)).toEqual([]);
  });
});

describe("shouldPromote", () => {
  const facet = (entity: string) => ({ entity, display: entity, count: 2 });

  it("splits once >= minFacets facets emerge", () => {
    expect(shouldPromote([facet("fable"), facet("ipo")])).toBe(true);
  });

  it("stays flat below the bar", () => {
    expect(shouldPromote([facet("fable")])).toBe(false);
    expect(shouldPromote([])).toBe(false);
  });
});

describe("selectNextThreadJob (Phase D3 activity priority + cap)", () => {
  const cand = (over: Partial<ThreadJobCandidate> & { threadId: string }): ThreadJobCandidate => ({
    followed: false,
    newItemCount: 1,
    ...over,
  });

  it("returns null once the per-edition cap is spent", () => {
    const c = [cand({ threadId: "a" })];
    expect(selectNextThreadJob(c, { cap: 3, advancedCount: 3 })).toBeNull();
    expect(selectNextThreadJob(c, { cap: 3, advancedCount: 4 })).toBeNull();
  });

  it("returns null when there are no candidates", () => {
    expect(selectNextThreadJob([], { cap: 8, advancedCount: 0 })).toBeNull();
  });

  it("prefers a followed thread over a busier unfollowed one", () => {
    const c = [
      cand({ threadId: "busy", newItemCount: 9 }),
      cand({ threadId: "followed", followed: true, newItemCount: 1 }),
    ];
    expect(selectNextThreadJob(c, { cap: 8, advancedCount: 0 })).toBe("followed");
  });

  it("is type-neutral: a busier storyline beats a one-item flat thread", () => {
    // regression: an earlier umbrella-before-storyline rule starved storylines.
    const c = [
      cand({ threadId: "flat-thread" }), // 1 item
      cand({ threadId: "busy-storyline", newItemCount: 4 }),
    ];
    expect(selectNextThreadJob(c, { cap: 8, advancedCount: 0 })).toBe("busy-storyline");
  });

  it("breaks ties by new-item count, then stable id", () => {
    const c = [
      cand({ threadId: "z", newItemCount: 2 }),
      cand({ threadId: "a", newItemCount: 5 }),
      cand({ threadId: "b", newItemCount: 5 }),
    ];
    expect(selectNextThreadJob(c, { cap: 8, advancedCount: 0 })).toBe("a"); // busiest, id tiebreak a<b
  });
});

describe("aggregateUmbrellaState (Phase D3 read-side rollup)", () => {
  it("composes the general bucket + each storyline's state", () => {
    const out = aggregateUmbrellaState("De brede context.", [
      { anchor: "fable", state: "Fable groeit." },
      { anchor: "ipo", state: "Beursgang nadert." },
    ]);
    expect(out).toBe("Algemeen: De brede context.\n\nFable: Fable groeit.\n\nIpo: Beursgang nadert.");
  });

  it("skips blank child states and a blank general bucket", () => {
    expect(
      aggregateUmbrellaState(null, [
        { anchor: "fable", state: "Alleen dit." },
        { anchor: "ipo", state: null },
        { anchor: "science", state: "   " },
      ]),
    ).toBe("Fable: Alleen dit.");
  });

  it("returns an empty string when nothing has state", () => {
    expect(aggregateUmbrellaState(null, [{ anchor: "fable", state: null }])).toBe("");
    expect(aggregateUmbrellaState("  ", [])).toBe("");
  });
});


// ---------------------------------------------------------------------------
// Phase F3 — entity-type-aware threading (lenient policy)
// ---------------------------------------------------------------------------

function ent(overrides: Partial<Entity> & Pick<Entity, "norm_key" | "type">): Entity {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    canonical_name: overrides.norm_key,
    aliases: [],
    confidence: "seed",
    first_seen_edition: null,
    created_at: "2026-07-02T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  };
}

// Anthropic=actor, Trump=person, Claude/Fable=product (with variant aliases),
// SpaceX=actor, an IPO=event, US=place. Untyped entities (e.g. "newco") default
// to 'other' via typeOf.
const F3_REGISTRY: EntityRegistry = buildRegistry([
  ent({ norm_key: "anthropic", type: "actor", canonical_name: "Anthropic" }),
  ent({ norm_key: "spacex", type: "actor", canonical_name: "SpaceX" }),
  ent({ norm_key: "trump", type: "person", canonical_name: "Trump" }),
  ent({ norm_key: "claude", type: "product", canonical_name: "Claude", aliases: ["claude science", "claude sonnet 5"] }),
  ent({ norm_key: "fable", type: "product", canonical_name: "Fable", aliases: ["claude fable 5"] }),
  ent({ norm_key: "ipo", type: "event", canonical_name: "IPO" }),
  ent({ norm_key: "us", type: "place", canonical_name: "US" }),
]);

describe("resolveEntityType (F3)", () => {
  it("reads the registry type, folding aliases to the canonical entry", () => {
    expect(resolveEntityType("anthropic", F3_REGISTRY)).toBe("actor");
    expect(resolveEntityType("claude", F3_REGISTRY)).toBe("product");
    expect(resolveEntityType("claude sonnet 5", F3_REGISTRY)).toBe("product"); // alias → claude
  });
  it("returns 'other' for unknown entities", () => {
    expect(resolveEntityType("newco", F3_REGISTRY)).toBe("other");
  });
});

describe("canAnchorUmbrella (F3, lenient)", () => {
  it("blocks product/event (facet) types from anchoring an umbrella", () => {
    expect(canAnchorUmbrella("claude", F3_REGISTRY)).toBe(false);
    expect(canAnchorUmbrella("claude fable 5", F3_REGISTRY)).toBe(false); // alias → fable (product)
    expect(canAnchorUmbrella("ipo", F3_REGISTRY)).toBe(false);
  });
  it("allows actor/person/place and untyped ('other') entities to anchor", () => {
    expect(canAnchorUmbrella("anthropic", F3_REGISTRY)).toBe(true);
    expect(canAnchorUmbrella("trump", F3_REGISTRY)).toBe(true);
    expect(canAnchorUmbrella("us", F3_REGISTRY)).toBe(true);
    expect(canAnchorUmbrella("newco", F3_REGISTRY)).toBe(true); // lenient: untyped may anchor
  });
});

describe("canBeFacet (F3)", () => {
  it("blocks actor/person (umbrella) types from being a facet", () => {
    expect(canBeFacet("anthropic", F3_REGISTRY)).toBe(false);
    expect(canBeFacet("trump", F3_REGISTRY)).toBe(false);
  });
  it("allows product/event/place and untyped entities as facets", () => {
    expect(canBeFacet("claude", F3_REGISTRY)).toBe(true);
    expect(canBeFacet("ipo", F3_REGISTRY)).toBe(true);
    expect(canBeFacet("newco", F3_REGISTRY)).toBe(true);
  });
});

describe("primaryEntity (F3 registry-aware)", () => {
  it("prefers the actor/person over a product listed first", () => {
    expect(primaryEntity(["Claude", "Anthropic"], F3_REGISTRY)).toEqual({
      entity: "anthropic",
      display: "Anthropic",
    });
  });
  it("falls back to the first usable entity when no actor/person is named", () => {
    expect(primaryEntity(["Claude", "Fable"], F3_REGISTRY)).toEqual({
      entity: "claude",
      display: "Claude",
    });
  });
  it("keeps first-usable behavior when no registry is supplied", () => {
    expect(primaryEntity(["Claude", "Anthropic"])).toEqual({ entity: "claude", display: "Claude" });
  });
});

describe("dominantEntity (F3 registry-aware)", () => {
  it("anchors on the dominant actor even when a product appears more often", () => {
    // Claude appears in all 3 items, Anthropic in 2 — without a registry Claude
    // would win; with it, the actor Anthropic anchors the cluster.
    const items = [
      { entities: ["Claude", "Anthropic"] },
      { entities: ["Claude", "Anthropic"] },
      { entities: ["Claude"] },
    ];
    expect(dominantEntity(items, F3_REGISTRY)).toEqual({ entity: "anthropic", display: "Anthropic" });
    expect(dominantEntity(items)).toEqual({ entity: "claude", display: "Claude" });
  });
  it("falls back to overall dominant when no actor/person is present", () => {
    const items = [{ entities: ["Claude", "Fable"] }, { entities: ["Claude"] }];
    expect(dominantEntity(items, F3_REGISTRY)).toEqual({ entity: "claude", display: "Claude" });
  });
});

describe("bigTopicAnchors (F3 registry-aware)", () => {
  it("anchors a product-heavy cluster on its actor, not the product", () => {
    const items = [
      { id: "a", entities: ["Claude", "Anthropic"] },
      { id: "b", entities: ["Claude", "Anthropic"] },
      { id: "c", entities: ["Claude", "Anthropic"] },
    ];
    const out = bigTopicAnchors(items, 0.3, 3, F3_REGISTRY);
    expect(out).toEqual([{ entity: "anthropic", display: "Anthropic", reason: "big_topic" }]);
  });
});

describe("personalAnchors (F3 registry-aware)", () => {
  it("threads a tracked product item under its actor", () => {
    const candidates: ThreadCandidate[] = [
      {
        itemId: "i1",
        title: "Anthropic ships Claude Sonnet 5",
        topicId: "t1",
        categoryId: "c1",
        entities: ["Claude", "Anthropic"],
        importance: 5,
        deep: false,
      },
    ];
    const out = personalAnchors(candidates, new Set(), new Set(), new Set(["t1"]), F3_REGISTRY);
    expect(out).toEqual([{ entity: "anthropic", display: "Anthropic", reason: "tracked" }]);
  });
});

describe("storylineFacets (F3 registry-aware)", () => {
  it("keeps products/events as facets but drops co-occurring actors (siblings)", () => {
    // Under the Anthropic umbrella: Claude (product) and the IPO (event) are
    // facets; OpenAI-like actor SpaceX co-occurs but must not become a facet.
    const items = [
      { entities: ["Anthropic", "Claude", "IPO"] },
      { entities: ["Anthropic", "Claude", "SpaceX"] },
    ];
    const facets = storylineFacets("anthropic", items, 1, new Set(), F3_REGISTRY);
    const names = facets.map((f) => f.entity);
    expect(names).toContain("claude");
    expect(names).toContain("ipo");
    expect(names).not.toContain("spacex"); // actor → sibling, never a facet
  });
});
