import { describe, it, expect } from "vitest";
import { cleanPrediction } from "./index";

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
