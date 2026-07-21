import { describe, it, expect } from "vitest";
import {
  buildExtractionPrompt,
  parseExtraction,
  emptyExtraction,
  MAX_ENTITIES,
  CATEGORY_SLUGS,
} from "./index";

describe("buildExtractionPrompt", () => {
  it("includes the title and body", () => {
    const prompt = buildExtractionPrompt("Bamboe-investeringen", "Bamboe groeit razendsnel en...");
    expect(prompt).toContain("Bamboe-investeringen");
    expect(prompt).toContain("Bamboe groeit razendsnel en...");
  });

  it("trims title and body", () => {
    const prompt = buildExtractionPrompt("  Titel  ", "  Body tekst  ");
    expect(prompt).toContain("Titel: Titel");
    expect(prompt).toContain("Body tekst");
    expect(prompt).not.toContain("Titel:   Titel");
  });

  it("mentions the entity cap and the category catalog", () => {
    const prompt = buildExtractionPrompt("T", "B");
    expect(prompt).toContain(String(MAX_ENTITIES));
    for (const slug of CATEGORY_SLUGS) {
      expect(prompt).toContain(slug);
    }
  });

  it("asks for JSON output", () => {
    const prompt = buildExtractionPrompt("T", "B");
    expect(prompt.toUpperCase()).toContain("JSON");
  });
});

describe("parseExtraction", () => {
  it("parses a well-formed response", () => {
    const raw = JSON.stringify({
      entities: ["Anthropic", "Claude"],
      topicLabel: "AI-modelontwikkeling",
      categorySlug: "tech",
    });
    expect(parseExtraction(raw)).toEqual({
      entities: ["anthropic", "claude"],
      topicLabel: "AI-modelontwikkeling",
      categorySlug: "tech",
    });
  });

  it("strips a ```json markdown fence", () => {
    const raw = "```json\n" + JSON.stringify({ entities: ["Tesla"], topicLabel: "EV's", categorySlug: "tech" }) + "\n```";
    expect(parseExtraction(raw)).toEqual({
      entities: ["tesla"],
      topicLabel: "EV's",
      categorySlug: "tech",
    });
  });

  it("degrades to empty on an empty/blank string", () => {
    expect(parseExtraction("")).toEqual(emptyExtraction());
    expect(parseExtraction("   ")).toEqual(emptyExtraction());
  });

  it("degrades to empty on unparsable JSON", () => {
    expect(parseExtraction("dit is geen JSON")).toEqual(emptyExtraction());
    expect(parseExtraction("{ entities: [oops")).toEqual(emptyExtraction());
  });

  it("degrades to empty on valid JSON that isn't an object", () => {
    expect(parseExtraction("[1,2,3]")).toEqual(emptyExtraction());
    expect(parseExtraction('"just a string"')).toEqual(emptyExtraction());
    expect(parseExtraction("null")).toEqual(emptyExtraction());
  });

  it("dedupes entities via normalizeEntity and caps at MAX_ENTITIES", () => {
    const raw = JSON.stringify({
      entities: ["Trump", "Donald Trump", "trump administration", "US", "United States", "UK", "EU", "China", "France", "Germany", "Russia"],
      topicLabel: "Geopolitiek",
      categorySlug: "wereld",
    });
    const result = parseExtraction(raw);
    expect(result.entities.length).toBeLessThanOrEqual(MAX_ENTITIES);
    // "Trump", "Donald Trump", "trump administration" all normalize to "trump" — one entry
    expect(result.entities.filter((e: string) => e === "trump")).toHaveLength(1);
    // "US" and "United States" both normalize to "us" — one entry
    expect(result.entities.filter((e: string) => e === "us")).toHaveLength(1);
  });

  it("ignores non-string entries in the entities array", () => {
    const raw = JSON.stringify({ entities: ["Tesla", 42, null, {}], topicLabel: "T", categorySlug: null });
    expect(parseExtraction(raw).entities).toEqual(["tesla"]);
  });

  it("falls back to an empty topicLabel when missing or wrong-typed", () => {
    expect(parseExtraction(JSON.stringify({ entities: [], categorySlug: null })).topicLabel).toBe("");
    expect(parseExtraction(JSON.stringify({ entities: [], topicLabel: 5, categorySlug: null })).topicLabel).toBe("");
  });

  it("falls back to null categorySlug when missing or unknown", () => {
    expect(parseExtraction(JSON.stringify({ entities: [], topicLabel: "T" })).categorySlug).toBeNull();
    expect(
      parseExtraction(JSON.stringify({ entities: [], topicLabel: "T", categorySlug: "not-a-real-slug" }))
        .categorySlug,
    ).toBeNull();
    expect(
      parseExtraction(JSON.stringify({ entities: [], topicLabel: "T", categorySlug: 123 })).categorySlug,
    ).toBeNull();
  });

  it("accepts every known category slug", () => {
    for (const slug of CATEGORY_SLUGS) {
      const raw = JSON.stringify({ entities: [], topicLabel: "T", categorySlug: slug });
      expect(parseExtraction(raw).categorySlug).toBe(slug);
    }
  });
});
