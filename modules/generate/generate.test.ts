import { describe, it, expect } from "vitest";
import {
  cleanPrediction,
  excerptForPrompt,
  cleanArticle,
  flattenArticle,
  storylineFraming,
  groundingSourcesFrom,
} from "./index";
import type { Grounding } from "../tavily";

const TODAY = "2026-06-19";

function raw(over: Record<string, string> = {}) {
  return {
    text: "Het akkoord wordt naar verwachting eind juli getekend.",
    target_date: "2026-07-31",
    confidence: "verwacht",
    source_basis: "Item 2: 'Tehran says deal to be signed'",
    ...over,
  };
}

describe("cleanPrediction (source-grounded, no basis ⇒ none)", () => {
  it("keeps a grounded, future, well-formed prediction", () => {
    expect(cleanPrediction(raw(), TODAY)).toEqual({
      text: "Het akkoord wordt naar verwachting eind juli getekend.",
      target_date: "2026-07-31",
      confidence: "verwacht",
      source_basis: "Item 2: 'Tehran says deal to be signed'",
    });
  });

  it("drops a prediction with no source_basis", () => {
    expect(cleanPrediction(raw({ source_basis: "  " }), TODAY)).toBeNull();
  });

  it("drops a prediction with no text", () => {
    expect(cleanPrediction(raw({ text: "" }), TODAY)).toBeNull();
  });

  it("drops a malformed or past target date", () => {
    expect(cleanPrediction(raw({ target_date: "ergens in juli" }), TODAY)).toBeNull();
    expect(cleanPrediction(raw({ target_date: "2026-06-18" }), TODAY)).toBeNull(); // past
  });

  it("keeps today as a valid target date", () => {
    expect(cleanPrediction(raw({ target_date: TODAY }), TODAY)?.target_date).toBe(TODAY);
  });

  it("falls back to 'verwacht' for an unknown confidence", () => {
    expect(cleanPrediction(raw({ confidence: "zeker-weten" }), TODAY)?.confidence).toBe("verwacht");
  });

  it("returns null for a missing object", () => {
    expect(cleanPrediction(null, TODAY)).toBeNull();
    expect(cleanPrediction(undefined, TODAY)).toBeNull();
  });
});

describe("excerptForPrompt (bounded body fed to deep research)", () => {
  it("prefers the full body over the short summary", () => {
    expect(excerptForPrompt("De volledige tekst.", "kort", 100)).toBe("De volledige tekst.");
  });

  it("falls back to the summary when there is no body", () => {
    expect(excerptForPrompt(null, "alleen een snippet", 100)).toBe("alleen een snippet");
    expect(excerptForPrompt("   ", "snippet", 100)).toBe("snippet");
  });

  it("returns null when neither body nor summary has content", () => {
    expect(excerptForPrompt(null, null, 100)).toBeNull();
    expect(excerptForPrompt("  ", "  ", 100)).toBeNull();
  });

  it("bounds an over-long body and marks the cut", () => {
    const body = "Eerste zin is lang genoeg. " + "x".repeat(200);
    const out = excerptForPrompt(body, null, 40)!;
    expect(out.length).toBeLessThanOrEqual(44); // ~maxChars + " […]"
    expect(out.endsWith("[…]")).toBe(true);
  });

  it("cuts on a sentence boundary when one sits near the limit", () => {
    const body = "Dit is de eerste zin van het artikel. " + "a".repeat(100);
    expect(excerptForPrompt(body, null, 50)).toBe("Dit is de eerste zin van het artikel. […]");
  });
});

describe("cleanArticle (two-layer article: bounded grounded ripples)", () => {
  it("keeps a well-formed lead and trims its ripples", () => {
    expect(
      cleanArticle({
        lead: "  SpaceX zakte 12,5%.  ",
        ripples: [{ subhead: " Tesla mee omlaag ", text: " Beleggers verschoven.  " }],
      }),
    ).toEqual({
      lead: "SpaceX zakte 12,5%.",
      ripples: [{ subhead: "Tesla mee omlaag", text: "Beleggers verschoven." }],
    });
  });

  it("drops ripples missing a subhead or text", () => {
    const out = cleanArticle({
      lead: "Feit.",
      ripples: [
        { subhead: "Goed", text: "met body" },
        { subhead: "", text: "geen kop" },
        { subhead: "geen body", text: "  " },
      ],
    });
    expect(out.ripples).toEqual([{ subhead: "Goed", text: "met body" }]);
  });

  it("caps ripples at the given maxRipples", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ subhead: `Kop ${i}`, text: `Tekst ${i}` }));
    expect(cleanArticle({ lead: "L", ripples: many }, 5).ripples).toHaveLength(5);
    expect(cleanArticle({ lead: "L", ripples: many }, 3).ripples).toHaveLength(3);
  });

  it("handles a missing/empty object", () => {
    expect(cleanArticle(null)).toEqual({ lead: "", ripples: [] });
    expect(cleanArticle({ lead: "L" })).toEqual({ lead: "L", ripples: [] });
  });
});

describe("groundingSourcesFrom (Tavily snippets → stored article sources)", () => {
  const g = (snips: { title: string; url: string; content?: string }[]): Grounding => ({
    query: "q",
    snippets: snips.map((s) => ({ title: s.title, url: s.url, content: s.content ?? "body" })),
  });

  it("is undefined when grounding is absent or empty (field stays off)", () => {
    expect(groundingSourcesFrom(undefined)).toBeUndefined();
    expect(groundingSourcesFrom(g([]))).toBeUndefined();
  });

  it("maps snippets to {title, url}, dropping content", () => {
    expect(groundingSourcesFrom(g([{ title: "T1", url: "https://a.com", content: "x" }]))).toEqual([
      { title: "T1", url: "https://a.com" },
    ]);
  });

  it("dedupes by url and skips empty urls", () => {
    expect(
      groundingSourcesFrom(
        g([
          { title: "T1", url: "https://a.com" },
          { title: "dup", url: "https://a.com" },
          { title: "empty", url: "" },
          { title: "T2", url: "https://b.com" },
        ]),
      ),
    ).toEqual([
      { title: "T1", url: "https://a.com" },
      { title: "T2", url: "https://b.com" },
    ]);
  });
});

describe("flattenArticle (structured → plain text)", () => {
  it("joins the lead and each ripple as subhead + text", () => {
    expect(
      flattenArticle({
        lead: "De feiten.",
        ripples: [
          { subhead: "Tesla", text: "Mee omlaag." },
          { subhead: "Politiek", text: "Washington kijkt mee." },
        ],
      }),
    ).toBe("De feiten.\n\nTesla\nMee omlaag.\n\nPolitiek\nWashington kijkt mee.");
  });

  it("returns just the lead when there are no ripples", () => {
    expect(flattenArticle({ lead: "Alleen de feiten.", ripples: [] })).toBe("Alleen de feiten.");
  });
});

describe("storylineFraming (Phase D3 — name the storyline)", () => {
  it("names the facet within its umbrella", () => {
    expect(storylineFraming({ umbrella: "Anthropic", facet: "fable" })).toBe(
      "Dit is de verhaallijn 'fable' binnen het grote verhaal 'Anthropic'; schrijf de update toegespitst op deze facet.\n",
    );
  });

  it("is empty for a flat thread / umbrella (no storyline context)", () => {
    expect(storylineFraming(undefined)).toBe("");
  });

  it("is empty when facet or umbrella is blank", () => {
    expect(storylineFraming({ umbrella: "Anthropic", facet: "  " })).toBe("");
    expect(storylineFraming({ umbrella: "", facet: "fable" })).toBe("");
  });
});
