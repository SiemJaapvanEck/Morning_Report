import { describe, it, expect } from "vitest";
import { priority, assignBands, ratingToDelta, type ScoreContext } from "./index";

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
