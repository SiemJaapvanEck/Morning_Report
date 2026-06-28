import { describe, it, expect } from "vitest";
import { buildQuery, shapeGrounding, formatGroundingBlock, emptyGrounding } from "./index";

describe("buildQuery", () => {
  it("appends entities that add information to the title", () => {
    expect(buildQuery("Q2-cijfers vallen tegen", ["Tesla", "Elon Musk"])).toBe(
      "Q2-cijfers vallen tegen Tesla Elon Musk",
    );
  });

  it("drops entities already named in the title (case-insensitive)", () => {
    expect(buildQuery("Tesla kondigt ontslagen aan", ["tesla", "Austin"])).toBe(
      "Tesla kondigt ontslagen aan Austin",
    );
  });

  it("de-dupes repeated entities and caps how many it appends", () => {
    expect(
      buildQuery("Klimaattop", ["Parijs", "Parijs", "Brussel", "Berlijn", "Madrid", "Rome"], 3),
    ).toBe("Klimaattop Parijs Brussel Berlijn");
  });

  it("falls back to the bare title when there are no usable entities", () => {
    expect(buildQuery("  Groot nieuws  ", [])).toBe("Groot nieuws");
    expect(buildQuery("Groot nieuws", ["  "])).toBe("Groot nieuws");
  });
});

describe("shapeGrounding", () => {
  const raw = [
    { title: "A", url: "https://a.test", content: "veel tekst over A" },
    { title: "B", url: "https://b.test", content: "veel tekst over B" },
    { title: "C", url: "https://c.test", content: "veel tekst over C" },
  ];

  it("keeps only results with both a url and content, trimmed", () => {
    const out = shapeGrounding(
      "q",
      [
        { title: "ok", url: "https://ok.test", content: "  body  " },
        { title: "no-url", url: "", content: "body" },
        { title: "no-content", url: "https://x.test", content: "   " },
      ],
      10,
      1000,
    );
    expect(out.snippets).toEqual([{ title: "ok", url: "https://ok.test", content: "body" }]);
    expect(out.query).toBe("q");
  });

  it("caps the number of snippets", () => {
    expect(shapeGrounding("q", raw, 2, 1000).snippets).toHaveLength(2);
  });

  it("bounds each snippet's length", () => {
    const out = shapeGrounding("q", [{ title: "x", url: "https://x.test", content: "abcdefghij" }], 5, 4);
    expect(out.snippets[0].content).toBe("abcd");
  });

  it("handles null/undefined raw results", () => {
    expect(shapeGrounding("q", null).snippets).toEqual([]);
    expect(shapeGrounding("q", undefined).snippets).toEqual([]);
  });
});

describe("formatGroundingBlock", () => {
  it("renders numbered, attributed citations", () => {
    const block = formatGroundingBlock({
      query: "q",
      snippets: [
        { title: "Titel A", url: "https://a.test", content: "feiten A" },
        { title: "Titel B", url: "https://b.test", content: "feiten B" },
      ],
    });
    expect(block).toContain("[1] Titel A");
    expect(block).toContain("feiten A");
    expect(block).toContain("(bron: https://a.test)");
    expect(block).toContain("[2] Titel B");
  });

  it("returns an empty string for empty grounding", () => {
    expect(formatGroundingBlock(emptyGrounding("q"))).toBe("");
  });

  it("falls back to the url as the heading when a title is missing", () => {
    const block = formatGroundingBlock({
      query: "q",
      snippets: [{ title: "", url: "https://a.test", content: "feiten" }],
    });
    expect(block).toContain("[1] https://a.test");
  });
});
