import { describe, expect, it } from "vitest";
import { addMonths, buildPortfolioChart, monthKey, monthsBetween, toSegments } from "./financien";
import type { CostBasisPoint } from "../../modules/finance";

describe("monthKey", () => {
  it("keeps only year-month", () => {
    expect(monthKey("2026-03-15")).toBe("2026-03");
  });
});

describe("addMonths", () => {
  it("adds within the same year", () => {
    expect(addMonths("2026-01", 2)).toBe("2026-03");
  });

  it("rolls over into the next year", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });

  it("rolls back into the previous year", () => {
    expect(addMonths("2026-01", -2)).toBe("2025-11");
  });
});

describe("monthsBetween", () => {
  it("counts whole months forward", () => {
    expect(monthsBetween("2026-01", "2026-04")).toBe(3);
  });

  it("counts across a year boundary", () => {
    expect(monthsBetween("2025-11", "2026-02")).toBe(3);
  });
});

describe("buildPortfolioChart", () => {
  const costBasis: CostBasisPoint[] = [
    { date: "2026-01-10", cost_basis_eur: 1000 },
    { date: "2026-03-05", cost_basis_eur: 2500 },
  ];

  it("aligns cost basis, today marker and projection on one monthly axis", () => {
    const projection = [2700, 2800, 2900]; // today, +1mo, +2mo
    const data = buildPortfolioChart(costBasis, 2700, projection, "2026-04-01");

    expect(data.months).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(data.todayIndex).toBe(3); // April

    // cost basis carries forward the last known value up to today, then stops
    expect(data.costBasis).toEqual([1000, 1000, 2500, 2500, null, null]);

    // current value is anchored exactly at today, nowhere else
    expect(data.currentValue).toEqual([null, null, null, 2700, null, null]);

    // projection starts at today and runs forward
    expect(data.projection).toEqual([null, null, null, 2700, 2800, 2900]);
  });

  it("still produces a valid single-anchor timeline with no buy history", () => {
    const data = buildPortfolioChart([], 500, [500, 550], "2026-06-01");
    expect(data.months).toEqual(["2026-06", "2026-07"]);
    expect(data.todayIndex).toBe(0);
    expect(data.costBasis).toEqual([null, null]);
    expect(data.currentValue).toEqual([500, null]);
    expect(data.projection).toEqual([500, 550]);
  });
});

describe("toSegments", () => {
  it("splits a nullable series into contiguous polyline runs", () => {
    const segments = toSegments([10, 20, null, null, 40], 40);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(2);
    expect(segments[1]).toHaveLength(1);
    // x positions still reflect the original 5-wide index space
    expect(segments[0][0].x).toBe(0);
    expect(segments[0][1].x).toBe(25);
    expect(segments[1][0].x).toBe(100);
  });

  it("returns no segments for an all-null series", () => {
    expect(toSegments([null, null], 10)).toEqual([]);
  });
});
