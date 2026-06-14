import { describe, it, expect } from "vitest";
import { relevantieNaarScore, naamNaarSlug } from "./index";

describe("relevantieNaarScore (voorkeur → beginscore)", () => {
  it("schaalt −2…+2 naar −0.6…+0.6 (ruimte voor leren tot ±1)", () => {
    expect(relevantieNaarScore(2)).toBeCloseTo(0.6);
    expect(relevantieNaarScore(1)).toBeCloseTo(0.3);
    expect(relevantieNaarScore(0)).toBe(0);
    expect(relevantieNaarScore(-1)).toBeCloseTo(-0.3);
    expect(relevantieNaarScore(-2)).toBeCloseTo(-0.6);
  });

  it("clampt buiten bereik en rondt af", () => {
    expect(relevantieNaarScore(5)).toBeCloseTo(0.6);
    expect(relevantieNaarScore(-9)).toBeCloseTo(-0.6);
    expect(relevantieNaarScore(1.4)).toBeCloseTo(0.3);
  });
});

describe("naamNaarSlug (eigen topics/categorieën)", () => {
  it("maakt url-veilige slugs", () => {
    expect(naamNaarSlug("AI-nieuws")).toBe("ai-nieuws");
    expect(naamNaarSlug("Anthropic (Claude)")).toBe("anthropic-claude");
    expect(naamNaarSlug("  Café Crème  ")).toBe("cafe-creme");
  });

  it("zelfde naam → zelfde slug (dedupe van eigen categorieën)", () => {
    expect(naamNaarSlug("Goed Nieuws")).toBe(naamNaarSlug("goed nieuws"));
  });
});
