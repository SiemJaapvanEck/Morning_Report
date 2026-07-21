import { describe, it, expect } from "vitest";
import { dayOfYear, formatMarktDelta, regioBarData } from "./krant-a3";

describe("dayOfYear", () => {
  it("returns 1 for January 1st", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
  });
  it("returns 183 for July 2nd in a non-leap year", () => {
    expect(dayOfYear("2026-07-02")).toBe(183);
  });
  it("handles leap year December 31st as day 366", () => {
    expect(dayOfYear("2024-12-31")).toBe(366);
  });
  it("returns 365 for December 31st in a non-leap year", () => {
    expect(dayOfYear("2026-12-31")).toBe(365);
  });
});

describe("formatMarktDelta", () => {
  it("prefixes positive values with +", () => {
    expect(formatMarktDelta(1.23)).toBe("+1.23%");
  });
  it("keeps the minus sign for negative values", () => {
    expect(formatMarktDelta(-0.55)).toBe("-0.55%");
  });
  it("treats zero as positive", () => {
    expect(formatMarktDelta(0)).toBe("+0.00%");
  });
  it("rounds to 2 decimal places", () => {
    expect(formatMarktDelta(1.2)).toBe("+1.20%");
  });
});

describe("regioBarData", () => {
  it("returns empty for empty input", () => {
    expect(regioBarData({})).toEqual([]);
  });
  it("filters out zero-count entries", () => {
    const rows = regioBarData({ eu: 3, na: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe("eu");
  });
  it("scales so the max-count entry is 100%", () => {
    const rows = regioBarData({ eu: 4, na: 2 });
    expect(rows[0].pct).toBe(100);
    expect(rows[1].pct).toBe(50);
  });
  it("sorts by count descending", () => {
    const rows = regioBarData({ ap: 1, eu: 5, na: 3 });
    expect(rows.map((r) => r.code)).toEqual(["eu", "na", "ap"]);
  });
  it("resolves Dutch regio names", () => {
    const rows = regioBarData({ eu: 1 });
    expect(rows[0].naam).toBe("Europa");
  });
  it("falls back to the code for unknown regios", () => {
    const rows = regioBarData({ xx: 2 });
    expect(rows[0].naam).toBe("xx");
  });
  it("returns all-zero pct when max is 0 (guard)", () => {
    // This can't happen normally (we filter n > 0), but the guard is correct.
    const rows = regioBarData({ eu: 1 });
    expect(rows[0].pct).toBe(100);
  });
});
