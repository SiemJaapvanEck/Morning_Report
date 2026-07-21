import { describe, expect, it } from "vitest";
import { formatEuro, formatPct, parseAmount } from "./geld";

// Intl.NumberFormat('nl-NL', ...) separates the symbol from the number with
// a non-breaking space (U+00A0), not a regular space.
const NBSP = " ";

describe("formatEuro", () => {
  it("formats a whole euro amount", () => {
    expect(formatEuro(1234)).toBe(`€${NBSP}1.234,00`);
  });

  it("formats decimals with a comma", () => {
    expect(formatEuro(1234.5)).toBe(`€${NBSP}1.234,50`);
  });

  it("formats zero", () => {
    expect(formatEuro(0)).toBe(`€${NBSP}0,00`);
  });

  it("formats negative amounts", () => {
    expect(formatEuro(-42.1)).toBe(`€${NBSP}-42,10`);
  });
});

describe("formatPct", () => {
  it("formats a whole percentage with one decimal by default", () => {
    expect(formatPct(7)).toBe("7,0%");
  });

  it("formats a fractional percentage", () => {
    expect(formatPct(2.345, 2)).toBe("2,35%");
  });

  it("formats a negative percentage", () => {
    expect(formatPct(-2.345, 2)).toBe("-2,35%");
  });

  it("formats zero", () => {
    expect(formatPct(0)).toBe("0,0%");
  });
});

describe("parseAmount", () => {
  it("parses a plain integer", () => {
    expect(parseAmount("42")).toBe(42);
  });

  it("parses a Dutch decimal comma", () => {
    expect(parseAmount("12,5")).toBe(12.5);
  });

  it("parses a thousands-separated amount with decimal comma", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
  });

  it("parses a leading euro sign and whitespace", () => {
    expect(parseAmount("€ 12,5")).toBe(12.5);
    expect(parseAmount("  99  ")).toBe(99);
  });

  it("returns null for an empty string", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(parseAmount("abc")).toBeNull();
  });

  it("never throws on garbage input", () => {
    expect(() => parseAmount("€€€,,,...")).not.toThrow();
  });
});
