import { describe, it, expect } from "vitest";
import {
  priority,
  assignBands,
  ratingToDelta,
  recencyFactor,
  preRankScore,
  isUserSelected,
  selectForScan,
  type ScoreContext,
} from "./index";

function ctx(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return {
    topicScores: new Map(),
    categoryScores: new Map(),
    sourceWeights: new Map(),
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
});

describe("isUserSelected", () => {
  const followedTopics = new Set(["topic-1"]);
  const followedCats = new Set(["cat-1"]);

  it("matches on a followed topic or category", () => {
    expect(isUserSelected({ source_id: null, category_id: null, topic_id: "topic-1", published_at: null }, followedTopics, followedCats)).toBe(true);
    expect(isUserSelected({ source_id: null, category_id: "cat-1", topic_id: null, published_at: null }, followedTopics, followedCats)).toBe(true);
  });

  it("is false when neither is followed", () => {
    expect(isUserSelected({ source_id: null, category_id: "cat-x", topic_id: "topic-x", published_at: null }, followedTopics, followedCats)).toBe(false);
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
