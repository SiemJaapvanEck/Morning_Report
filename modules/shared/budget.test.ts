import { describe, it, expect } from "vitest";
import { budgetMode, budgetPolicy } from "./budget";

describe("budgetMode", () => {
  it("start in modus 'vol'", () => {
    expect(budgetMode(0, 0.3)).toBe("vol");
    expect(budgetMode(0.1, 0.3)).toBe("vol");
  });

  it("schakelt terug naar 'zuinig' vanaf 60% van het plafond", () => {
    expect(budgetMode(0.18, 0.3)).toBe("zuinig");
    expect(budgetMode(0.2, 0.3)).toBe("zuinig");
  });

  it("schakelt naar 'minimaal' vanaf 85%", () => {
    expect(budgetMode(0.26, 0.3)).toBe("minimaal");
  });

  it("stopt op het plafond — nooit stilletjes doorbranden", () => {
    expect(budgetMode(0.3, 0.3)).toBe("stop");
    expect(budgetMode(0.5, 0.3)).toBe("stop");
  });

  it("stop-modus staat geen enkele Claude-call meer toe", () => {
    expect(budgetPolicy.stop.deepDivesPerSectie).toBe(0);
    expect(budgetPolicy.stop.samenvattingMaxTokens).toBe(0);
    expect(budgetPolicy.stop.solMaxTokens).toBe(0);
  });
});
