import { describe, it, expect } from "vitest";
import {
  priority,
  assignBands,
  distributeBands,
  ratingToDelta,
  recencyFactor,
  preRankScore,
  isUserSelected,
  selectForScan,
  buildEntityMaps,
  type ScoreContext,
  type CategoryBands,
  type DistributeOptions,
} from "./index";
import type { EntityRegistry } from "../entities";
import type { Entity } from "../shared/types";

function ctx(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return {
    topicScores: new Map(),
    categoryScores: new Map(),
    sourceWeights: new Map(),
    followedTopicIds: new Set(),
    followedCategoryIds: new Set(),
    ...overrides,
  };
}

describe("priority", () => {
  it("neutrale start: alleen belang telt", () => {
    const p = priority(
      { topic_id: null, category_id: null, source_id: null, importance: 0.8 },
      ctx(),
    );
    expect(p).toBeCloseTo(0.8);
  });

  it("topic-score overschrijft categorie-score (overerving)", () => {
    const context = ctx({
      topicScores: new Map([["topic-1", 1.0]]),
      categoryScores: new Map([["cat-1", -1.0]]),
    });
    const p = priority(
      { topic_id: "topic-1", category_id: "cat-1", source_id: null, importance: 0.5 },
      context,
    );
    // interesse 1.0 → factor 1.75
    expect(p).toBeCloseTo(0.5 * 1.75);
  });

  it("zonder topic-score erft het item van de categorie", () => {
    const context = ctx({ categoryScores: new Map([["cat-1", -1.0]]) });
    const p = priority(
      { topic_id: "topic-zonder-score", category_id: "cat-1", source_id: null, importance: 0.5 },
      context,
    );
    // interesse -1.0 → factor 0.25: gedempt maar niet weg
    expect(p).toBeCloseTo(0.5 * 0.25);
  });

  it("bron-multiplier dempt clickbait-bronnen structureel", () => {
    const context = ctx({ sourceWeights: new Map([["bron-1", 0.5]]) });
    const p = priority(
      { topic_id: null, category_id: null, source_id: "bron-1", importance: 0.6 },
      context,
    );
    expect(p).toBeCloseTo(0.6 * 0.5);
  });

  it("Phase D: een gevolgd topic tilt naar de interesse-vloer", () => {
    const followed = priority(
      { topic_id: "t-follow", category_id: null, source_id: null, importance: 0.5 },
      ctx({ followedTopicIds: new Set(["t-follow"]) }),
    );
    const neutral = priority(
      { topic_id: "t-plain", category_id: null, source_id: null, importance: 0.5 },
      ctx(),
    );
    // vloer 0.6 → factor 1 + 0.6*0.75 = 1.45; gevolgd overtreft neutraal (factor 1)
    expect(followed).toBeCloseTo(0.5 * 1.45);
    expect(followed).toBeGreaterThan(neutral);
  });

  it("Phase D: de vloer verlaagt een al hogere score niet", () => {
    const p = priority(
      { topic_id: "t-1", category_id: null, source_id: null, importance: 0.5 },
      ctx({ topicScores: new Map([["t-1", 1.0]]), followedTopicIds: new Set(["t-1"]) }),
    );
    expect(p).toBeCloseTo(0.5 * 1.75); // 1.0 > vloer 0.6, dus de score blijft staan
  });
});

describe("assignBands (kostenpoort)", () => {
  const ranked = [
    { id: "a", priority: 0.9 },
    { id: "b", priority: 0.7 },
    { id: "c", priority: 0.5 },
    { id: "d", priority: 0.3 },
    { id: "e", priority: 0.2 },
    { id: "f", priority: 0.1 },
    { id: "g", priority: 0.05 },
    { id: "h", priority: 0.02 },
  ];

  it("modus 'vol': topband deep, midden summary, rest headline", () => {
    const bands = assignBands(ranked, "vol");
    expect(bands.get("a")).toBe("deep");
    expect(bands.get("b")).toBe("deep");
    expect(bands.get("c")).toBe("summary");
    expect(bands.get("h")).toBe("headline");
  });

  it("modus 'minimaal': geen deep-dives meer", () => {
    const bands = assignBands(ranked, "minimaal");
    expect([...bands.values()]).not.toContain("deep");
  });

  it("modus 'stop': alles headline — geen calls meer", () => {
    const bands = assignBands(ranked, "stop");
    expect(new Set(bands.values())).toEqual(new Set(["headline"]));
  });

  it("lage prioriteit krijgt geen deep-dive, ook bovenaan de lijst", () => {
    const bands = assignBands([{ id: "x", priority: 0.2 }], "vol");
    expect(bands.get("x")).toBe("summary"); // onder de deep-drempel van 0.5
  });

  it("Phase D: een gevolgd item is deep-waardig ook onder de 0.5-drempel", () => {
    const bands = assignBands([{ id: "x", priority: 0.2 }], "vol", 5, new Set(["x"]));
    expect(bands.get("x")).toBe("deep");
  });

  it("Phase D: de followed-tilt respecteert de budget-modus (minimaal = geen deep)", () => {
    const bands = assignBands([{ id: "x", priority: 0.2 }], "minimaal", 5, new Set(["x"]));
    expect(bands.get("x")).not.toBe("deep");
  });

  it("Phase C: brede pool — deep + maxSummaries betaald, de rest gratis koppen", () => {
    // 24 items, allemaal boven de deep-drempel zodat de banden puur door de
    // budget-policy (deepDivesPerSectie) en maxSummaries bepaald worden.
    const pool = Array.from({ length: 24 }, (_, i) => ({
      id: `i${i}`,
      priority: 0.9 - i * 0.01,
    }));
    const bands = assignBands(pool, "vol", 6);
    const counts = { deep: 0, summary: 0, headline: 0 };
    for (const b of bands.values()) counts[b]++;
    expect(counts.deep).toBe(2); // budgetPolicy.vol.deepDivesPerSectie
    expect(counts.summary).toBe(6); // de doorgegeven maxSummaries
    expect(counts.headline).toBe(16); // de gratis staart vult "Ook in het nieuws"
  });

  it("Phase C: 'zuinig' degradeert paid tiers maar houdt de gratis staart", () => {
    const pool = Array.from({ length: 24 }, (_, i) => ({
      id: `z${i}`,
      priority: 0.9 - i * 0.01,
    }));
    const bands = assignBands(pool, "zuinig", 6);
    const counts = { deep: 0, summary: 0, headline: 0 };
    for (const b of bands.values()) counts[b]++;
    expect(counts.deep).toBe(1); // budgetPolicy.zuinig.deepDivesPerSectie
    expect(counts.summary).toBe(6);
    expect(counts.headline).toBe(17);
  });
});

describe("distributeBands (Phase 4 — global, topic-aware)", () => {
  const dopts = (over: Partial<DistributeOptions> = {}): DistributeOptions => ({
    maxSummaries: 6,
    globalDeepCap: 10,
    perCategoryDeepCap: 2,
    deepFloor: 0.35,
    topicSummaryFloor: 0.9,
    ...over,
  });
  const cat = (id: string, items: [string, number, string?][]): CategoryBands => ({
    categoryId: id,
    ranked: items.map(([itemId, p, topic]) => ({ id: itemId, priority: p, topicId: topic ?? null })),
  });

  it("spreads deep across categories before deepening any one (round-robin)", () => {
    const cats = [
      cat("A", [["a1", 0.9], ["a2", 0.8]]),
      cat("B", [["b1", 0.85]]),
      cat("C", [["c1", 0.7], ["c2", 0.6]]),
    ];
    const bands = distributeBands(cats, "vol", dopts({ globalDeepCap: 3 }));
    // budget 3, one per category in round 1 → each category's top story, no seconds
    expect(bands.get("a1")).toBe("deep");
    expect(bands.get("b1")).toBe("deep");
    expect(bands.get("c1")).toBe("deep");
    expect(bands.get("a2")).not.toBe("deep");
    expect(bands.get("c2")).not.toBe("deep");
  });

  it("hands out remaining budget for second slots once every category has one", () => {
    const cats = [
      cat("A", [["a1", 0.9], ["a2", 0.8]]),
      cat("B", [["b1", 0.85]]),
      cat("C", [["c1", 0.7], ["c2", 0.6]]),
    ];
    const bands = distributeBands(cats, "vol", dopts({ globalDeepCap: 4 }));
    const deep = [...bands].filter(([, b]) => b === "deep").map(([id]) => id).sort();
    expect(deep).toEqual(["a1", "a2", "b1", "c1"]); // A gets its 2nd before depth elsewhere
  });

  it("a quiet category earns deep below the old 0.5 gate (deepFloor 0.35)", () => {
    const cats = [
      cat("Busy", [["x", 0.95], ["y", 0.9]]),
      cat("Quiet", [["q", 0.4]]),
    ];
    const bands = distributeBands(cats, "vol", dopts({ globalDeepCap: 10 }));
    expect(bands.get("q")).toBe("deep"); // 0.4 ≥ deepFloor, would have been starved before
  });

  it("an item below the deepFloor gets no deep slot", () => {
    const cats = [cat("Quiet", [["q", 0.2]])];
    const bands = distributeBands(cats, "vol", dopts());
    expect(bands.get("q")).not.toBe("deep");
  });

  it("a followed item bypasses the deepFloor", () => {
    const cats = [cat("Quiet", [["q", 0.2]])];
    const bands = distributeBands(cats, "vol", dopts({ followedIds: new Set(["q"]) }));
    expect(bands.get("q")).toBe("deep");
  });

  it("the global cap bounds total deep regardless of per-category headroom", () => {
    const cats = [
      cat("A", [["a1", 0.9], ["a2", 0.85]]),
      cat("B", [["b1", 0.8], ["b2", 0.75]]),
      cat("C", [["c1", 0.7], ["c2", 0.65]]),
    ];
    const bands = distributeBands(cats, "vol", dopts({ globalDeepCap: 3 }));
    expect([...bands.values()].filter((b) => b === "deep")).toHaveLength(3);
  });

  it("budget mode minimaal disables deep entirely", () => {
    const cats = [cat("A", [["a1", 0.95]])];
    const bands = distributeBands(cats, "minimaal", dopts());
    expect([...bands.values()]).not.toContain("deep");
  });

  it("a high-match topic keeps its own summary past the per-section cap", () => {
    // No deep (cap 0) so the topic-floor logic is isolated. maxSummaries 1 →
    // normally only the single top item is summarized.
    const cats = [
      cat("C", [["i1", 0.95, "T1"], ["i2", 0.93, "T2"], ["i3", 0.5, "T3"]]),
    ];
    const bands = distributeBands(cats, "vol", dopts({ globalDeepCap: 0, maxSummaries: 1 }));
    expect(bands.get("i1")).toBe("summary"); // top of section
    expect(bands.get("i2")).toBe("summary"); // ≥0.9 topic floor, beyond the cap
    expect(bands.get("i3")).toBe("headline"); // below the floor → stays free
  });

  it("budget mode stop makes everything a headline", () => {
    const cats = [cat("A", [["a1", 0.95, "T1"], ["a2", 0.9, "T2"]])];
    const bands = distributeBands(cats, "stop", dopts());
    expect(new Set(bands.values())).toEqual(new Set(["headline"]));
  });
});

describe("ratingToDelta", () => {
  it("is symmetrisch rond neutraal (3)", () => {
    expect(ratingToDelta(3)).toBe(0);
    expect(ratingToDelta(5)).toBeCloseTo(0.3);
    expect(ratingToDelta(1)).toBeCloseTo(-0.3);
  });
});

describe("recencyFactor", () => {
  const now = Date.UTC(2026, 5, 15, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it("fresh items keep full weight", () => {
    expect(recencyFactor(hoursAgo(0), now)).toBeCloseTo(1);
  });

  it("decays toward the floor across the window", () => {
    expect(recencyFactor(hoursAgo(24), now)).toBeCloseTo(0.65); // halfway
    expect(recencyFactor(hoursAgo(48), now)).toBeCloseTo(0.3); // floor at window edge
  });

  it("never drops below the floor, even past the window", () => {
    expect(recencyFactor(hoursAgo(500), now)).toBe(0.3);
  });

  it("a missing date stays neutral", () => {
    expect(recencyFactor(null, now)).toBe(0.5);
  });
});

describe("preRankScore (no LLM needed)", () => {
  const now = Date.UTC(2026, 5, 15, 12, 0, 0);
  const fresh = new Date(now).toISOString();

  it("neutral start: source weight × recency, interest factor 1", () => {
    const s = preRankScore({ source_id: null, category_id: null, topic_id: null, published_at: fresh }, ctx(), now);
    expect(s).toBeCloseTo(1);
  });

  it("low source weight pushes an item below a fresh item", () => {
    const context = ctx({ sourceWeights: new Map([["weak", 0.4]]) });
    const weak = preRankScore({ source_id: "weak", category_id: null, topic_id: null, published_at: fresh }, context, now);
    expect(weak).toBeCloseTo(0.4);
  });

  it("interest in a category lifts the score", () => {
    const context = ctx({ categoryScores: new Map([["cat-1", 1.0]]) });
    const s = preRankScore({ source_id: null, category_id: "cat-1", topic_id: null, published_at: fresh }, context, now);
    expect(s).toBeCloseTo(1.75); // interest 1.0 → factor 1.75
  });

  it("Phase D: a followed topic lifts the pre-rank score to the floor", () => {
    const context = ctx({ followedTopicIds: new Set(["t-follow"]) });
    const s = preRankScore({ source_id: null, category_id: null, topic_id: "t-follow", published_at: fresh }, context, now);
    expect(s).toBeCloseTo(1.45); // floor 0.6 → factor 1.45
  });
});

describe("isUserSelected", () => {
  const followedTopics = new Set(["topic-1"]);
  const followedCats = new Set(["cat-1"]);

  it("matches on a followed topic or category", () => {
    expect(isUserSelected({ category_id: null, topic_id: "topic-1" }, followedTopics, followedCats)).toBe(true);
    expect(isUserSelected({ category_id: "cat-1", topic_id: null }, followedTopics, followedCats)).toBe(true);
  });

  it("is false when neither is followed", () => {
    expect(isUserSelected({ category_id: "cat-x", topic_id: "topic-x" }, followedTopics, followedCats)).toBe(false);
  });
});

describe("selectForScan (pre-scan gate)", () => {
  const now = Date.UTC(2026, 5, 15, 12, 0, 0);
  const fresh = new Date(now).toISOString();
  const stale = new Date(now - 80 * 3_600_000).toISOString(); // well past the window

  it("drops items below the threshold but keeps fresh ones", () => {
    const candidates = [
      { id: "fresh", source_id: null, category_id: null, topic_id: null, published_at: fresh },
      { id: "stale", source_id: null, category_id: null, topic_id: null, published_at: stale },
    ];
    const picked = selectForScan(candidates, ctx(), new Set(), new Set(), 0.5, now);
    expect(picked.map((p) => p.id)).toEqual(["fresh"]);
  });

  it("always keeps a user-selected item, even when it would fail the threshold", () => {
    const candidates = [
      { id: "stale-followed", source_id: null, category_id: "cat-1", topic_id: null, published_at: stale },
    ];
    const picked = selectForScan(candidates, ctx(), new Set(), new Set(["cat-1"]), 0.5, now);
    expect(picked.map((p) => p.id)).toEqual(["stale-followed"]);
  });

  it("orders forced items first, then by score", () => {
    const candidates = [
      { id: "fresh", source_id: null, category_id: null, topic_id: null, published_at: fresh },
      { id: "stale-followed", source_id: null, category_id: "cat-1", topic_id: null, published_at: stale },
    ];
    const picked = selectForScan(candidates, ctx(), new Set(), new Set(["cat-1"]), 0.5, now);
    expect(picked.map((p) => p.id)).toEqual(["stale-followed", "fresh"]);
  });
});

// ============================================================
// buildEntityMaps — F2 write-back + scan-cost optimisation
// ============================================================

function entity(overrides: Partial<Entity> & Pick<Entity, "norm_key" | "type">): Entity {
  return {
    id: `id-${overrides.norm_key}`,
    canonical_name: overrides.canonical_name ?? overrides.norm_key,
    aliases: [],
    confidence: "ai_high",
    first_seen_edition: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function registry(...entries: Entity[]): EntityRegistry {
  return new Map(entries.map((e) => [e.norm_key, e]));
}

describe("buildEntityMaps", () => {
  it("uses the AI's type + confidence for a brand-new entity", () => {
    const out = buildEntityMaps([{ name: "Acme Corp", type: "actor", confidence: "high" }]);
    expect(out.entities).toEqual(["Acme Corp"]);
    expect(out.entity_types["acme corp"]).toBe("actor");
    expect(out.entity_confidence["acme corp"]).toBe("high");
    expect(out.entity_display["acme corp"]).toBe("Acme Corp");
  });

  it("registry type wins over the AI type for a known entity", () => {
    const reg = registry(entity({ norm_key: "claude", type: "product", canonical_name: "Claude" }));
    // AI mislabels it as an actor — registry should override.
    const out = buildEntityMaps([{ name: "Claude", type: "actor", confidence: "high" }], reg);
    expect(out.entity_types["claude"]).toBe("product");
  });

  it("falls back to other/low when the AI omits type/confidence for a NEW entity", () => {
    const out = buildEntityMaps([{ name: "Mystery Thing" }]);
    expect(out.entity_types["mystery thing"]).toBe("other");
    expect(out.entity_confidence["mystery thing"]).toBe("low");
  });

  it("omitted type/confidence on a KNOWN entity keeps the registry type (the cost-saver path)", () => {
    const reg = registry(entity({ norm_key: "anthropic", type: "actor", canonical_name: "Anthropic" }));
    // Model saved tokens by sending name only for an already-primed entity.
    const out = buildEntityMaps([{ name: "Anthropic" }], reg);
    expect(out.entity_types["anthropic"]).toBe("actor");
    // confidence floors to "low" — mergeRegistryEntry protects the stronger existing one.
    expect(out.entity_confidence["anthropic"]).toBe("low");
  });

  it("folds an alias onto its canonical key via the registry", () => {
    const reg = registry(
      entity({ norm_key: "openai", type: "actor", canonical_name: "OpenAI", aliases: ["open ai"] }),
    );
    const out = buildEntityMaps([{ name: "Open AI" }], reg);
    expect(out.entity_types["openai"]).toBe("actor");
  });

  it("first occurrence sets display + confidence for a repeated canonical key", () => {
    const out = buildEntityMaps([
      { name: "Tesla", type: "actor", confidence: "high" },
      { name: "TESLA", type: "actor", confidence: "low" },
    ]);
    expect(out.entity_display["tesla"]).toBe("Tesla");
    expect(out.entity_confidence["tesla"]).toBe("high");
  });
});
