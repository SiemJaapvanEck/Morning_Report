import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  costBasisSeries,
  etaMonthsToTarget,
  monthlySurplus,
  monthlyTotals,
  portfolioValueEur,
  projectCompound,
  projectRecurringForward,
  quantityAsOf,
  recurringMonthlyNet,
  type CostBasisBuy,
} from "./index";
import { fetchFxToEur, fetchQuotes } from "../markten";

describe("costBasisSeries", () => {
  it("accumulates EUR buys without conversion", () => {
    const buys: CostBasisBuy[] = [
      { bought_on: "2026-01-01", quantity: 10, price_native: 10, currency: "EUR", fee_eur: 1 },
      { bought_on: "2026-02-01", quantity: 5, price_native: 12, currency: "EUR", fee_eur: 0.5 },
    ];
    const series = costBasisSeries(buys);
    expect(series).toEqual([
      { date: "2026-01-01", cost_basis_eur: 101 }, // 10*10 + 1
      { date: "2026-02-01", cost_basis_eur: 101 + 60.5 }, // + (5*12 + 0.5)
    ]);
  });

  it("converts non-EUR buys using the buy-time FX rate", () => {
    const buys: CostBasisBuy[] = [
      { bought_on: "2026-01-01", quantity: 10, price_native: 100, currency: "USD", fee_eur: 0, fx_to_eur: 0.9 },
    ];
    expect(costBasisSeries(buys)).toEqual([{ date: "2026-01-01", cost_basis_eur: 900 }]);
  });

  it("contributes 0 for a non-EUR buy with no FX rate passed in (never guessed)", () => {
    const buys: CostBasisBuy[] = [
      { bought_on: "2026-01-01", quantity: 10, price_native: 100, currency: "USD", fee_eur: 5 },
    ];
    // no fx_to_eur: 0 * 10 * 100 + fee => only the fee lands, price contributes nothing
    expect(costBasisSeries(buys)).toEqual([{ date: "2026-01-01", cost_basis_eur: 5 }]);
  });

  it("sorts out-of-order buys and merges same-day buys into one point", () => {
    const buys: CostBasisBuy[] = [
      { bought_on: "2026-03-01", quantity: 1, price_native: 10, currency: "EUR", fee_eur: 0 },
      { bought_on: "2026-01-01", quantity: 1, price_native: 10, currency: "EUR", fee_eur: 0 },
      { bought_on: "2026-01-01", quantity: 2, price_native: 10, currency: "EUR", fee_eur: 0 },
    ];
    const series = costBasisSeries(buys);
    expect(series).toEqual([
      { date: "2026-01-01", cost_basis_eur: 30 },
      { date: "2026-03-01", cost_basis_eur: 40 },
    ]);
  });

  it("returns an empty series for no buys", () => {
    expect(costBasisSeries([])).toEqual([]);
  });
});

describe("quantityAsOf", () => {
  const buys = [
    { bought_on: "2026-01-01", quantity: 10 },
    { bought_on: "2026-02-15", quantity: 5 },
    { bought_on: "2026-03-01", quantity: 2 },
  ];

  it("sums only buys on or before the given date", () => {
    expect(quantityAsOf(buys, "2026-02-15")).toBe(15);
    expect(quantityAsOf(buys, "2026-01-31")).toBe(10);
  });

  it("includes everything for a date after all buys", () => {
    expect(quantityAsOf(buys, "2026-12-31")).toBe(17);
  });

  it("is 0 before any buy", () => {
    expect(quantityAsOf(buys, "2025-01-01")).toBe(0);
  });
});

describe("portfolioValueEur", () => {
  const holdings = [
    { id: "h1", symbol: "AAPL", currency: "USD" },
    { id: "h2", symbol: "ASML.AS", currency: "EUR" },
  ];
  const buys = [
    { holding_id: "h1", bought_on: "2026-01-01", quantity: 10 },
    { holding_id: "h2", bought_on: "2026-01-01", quantity: 3 },
  ];

  it("converts each holding to EUR via fx, EUR holdings passed through", () => {
    const quotes = { AAPL: { price: 200, currency: "USD" }, "ASML.AS": { price: 700, currency: "EUR" } };
    const fx = { USD: 0.9 };
    // 10 * 200 * 0.9 + 3 * 700 * 1
    expect(portfolioValueEur(holdings, buys, quotes, fx)).toBeCloseTo(1800 + 2100, 5);
  });

  it("skips a holding with no quote (koers onbekend -> 0, never guessed)", () => {
    const quotes = { "ASML.AS": { price: 700, currency: "EUR" } };
    const fx = { USD: 0.9 };
    expect(portfolioValueEur(holdings, buys, quotes, fx)).toBeCloseTo(2100, 5);
  });

  it("skips a holding with no FX rate for its currency (0, never guessed)", () => {
    const quotes = { AAPL: { price: 200, currency: "USD" }, "ASML.AS": { price: 700, currency: "EUR" } };
    const fx = {}; // no USD rate
    expect(portfolioValueEur(holdings, buys, quotes, fx)).toBeCloseTo(2100, 5);
  });

  it("is 0 for an empty portfolio", () => {
    expect(portfolioValueEur([], [], {}, {})).toBe(0);
  });
});

describe("monthlySurplus", () => {
  const incomes = [
    { received_on: "2026-06-01", amount_eur: 3000 },
    { received_on: "2026-07-01", amount_eur: 3200 },
  ];
  const expenses = [
    { spent_on: "2026-06-15", amount_eur: 1200 },
    { spent_on: "2026-07-10", amount_eur: 1500 },
    { spent_on: "2026-07-20", amount_eur: 300 },
  ];

  it("sums income minus expenses for the given month only", () => {
    expect(monthlySurplus(incomes, expenses, "2026-07")).toBe(3200 - 1800);
    expect(monthlySurplus(incomes, expenses, "2026-06")).toBe(3000 - 1200);
  });

  it("is 0 for a month with no entries", () => {
    expect(monthlySurplus(incomes, expenses, "2026-01")).toBe(0);
  });
});

describe("monthlyTotals", () => {
  const incomes = [
    { received_on: "2026-06-01", amount_eur: 3000 },
    { received_on: "2026-07-01", amount_eur: 3200 },
  ];
  const expenses = [
    { spent_on: "2026-06-15", amount_eur: 1200 },
    { spent_on: "2026-07-10", amount_eur: 1500 },
    { spent_on: "2026-07-20", amount_eur: 300 },
  ];

  it("groups by month ascending, with per-month totals and surplus", () => {
    expect(monthlyTotals(incomes, expenses)).toEqual([
      { month: "2026-06", income_eur: 3000, expense_eur: 1200, surplus_eur: 1800 },
      { month: "2026-07", income_eur: 3200, expense_eur: 1800, surplus_eur: 1400 },
    ]);
  });

  it("includes a month with only an expense (income 0)", () => {
    const result = monthlyTotals([], [{ spent_on: "2026-08-01", amount_eur: 50 }]);
    expect(result).toEqual([{ month: "2026-08", income_eur: 0, expense_eur: 50, surplus_eur: -50 }]);
  });

  it("returns [] for no entries at all", () => {
    expect(monthlyTotals([], [])).toEqual([]);
  });
});

describe("recurringMonthlyNet", () => {
  it("sums only recurring income minus only recurring expenses", () => {
    const incomes = [
      { recurring: true, amount_eur: 3000 }, // salary
      { recurring: false, amount_eur: 500 }, // one-off bonus, excluded
    ];
    const expenses = [
      { recurring: true, amount_eur: 1200 }, // rent
      { recurring: true, amount_eur: 300 }, // subscriptions
      { recurring: false, amount_eur: 800 }, // one-off purchase, excluded
    ];
    expect(recurringMonthlyNet(incomes, expenses)).toBe(3000 - 1500);
  });

  it("is 0 with no recurring entries", () => {
    expect(recurringMonthlyNet([{ recurring: false, amount_eur: 100 }], [])).toBe(0);
  });
});

describe("projectRecurringForward", () => {
  const incomes = [
    { recurring: true, amount_eur: 3000 },
    { recurring: false, amount_eur: 500 },
  ];
  const expenses = [
    { recurring: true, amount_eur: 1200 },
    { recurring: false, amount_eur: 800 },
  ];

  it("projects only the recurring net forward, month by month", () => {
    const rows = projectRecurringForward(incomes, expenses, "2026-07", 3);
    expect(rows).toEqual([
      { month: "2026-08", income_eur: 3000, expense_eur: 1200, surplus_eur: 1800 },
      { month: "2026-09", income_eur: 3000, expense_eur: 1200, surplus_eur: 1800 },
      { month: "2026-10", income_eur: 3000, expense_eur: 1200, surplus_eur: 1800 },
    ]);
  });

  it("rolls over a year boundary", () => {
    const rows = projectRecurringForward(incomes, expenses, "2026-11", 2);
    expect(rows.map((r) => r.month)).toEqual(["2026-12", "2027-01"]);
  });

  it("returns [] for 0 months", () => {
    expect(projectRecurringForward(incomes, expenses, "2026-07", 0)).toEqual([]);
  });
});

describe("projectCompound", () => {
  it("matches a hand-computed value for one month", () => {
    // 7% annual -> monthly rate = 1.07^(1/12) - 1
    const rate = Math.pow(1.07, 1 / 12) - 1;
    const expected = 1000 * (1 + rate) + 200;
    const series = projectCompound(1000, 200, 7, 1);
    expect(series[0]).toBe(1000);
    expect(series[1]).toBeCloseTo(expected, 6);
  });

  it("compounds forward month over month, matching hand-computed compounding", () => {
    const rate = Math.pow(1.07, 1 / 12) - 1;
    let expected = 1000;
    for (let i = 0; i < 12; i++) expected = expected * (1 + rate) + 100;
    const series = projectCompound(1000, 100, 7, 12);
    expect(series).toHaveLength(13);
    expect(series[12]).toBeCloseTo(expected, 6);
  });

  it("with 0% return and 0 contribution stays flat", () => {
    const series = projectCompound(500, 0, 0, 6);
    expect(series.every((v) => v === 500)).toBe(true);
  });
});

describe("etaMonthsToTarget", () => {
  it("returns 0 when the target is already met", () => {
    expect(etaMonthsToTarget(1000, 100, 7, 500)).toBe(0);
  });

  it("returns the month index matching a hand-computed projection", () => {
    const rate = Math.pow(1.07, 1 / 12) - 1;
    let value = 0;
    let month = 0;
    const target = 5000;
    while (value < target && month < 600) {
      month++;
      value = value * (1 + rate) + 300;
    }
    expect(etaMonthsToTarget(0, 300, 7, target)).toBe(month);
  });

  it("returns null when the target is unreachable within the month cap", () => {
    // no contribution, no growth -> flat balance that never reaches a higher target
    expect(etaMonthsToTarget(100, 0, 0, 1_000_000)).toBeNull();
  });
});

describe("fetchQuotes / fetchFxToEur (markten extension, never-throw contract)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetchQuotes degrades to an empty object on a network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(fetchQuotes(["AAPL", "MSFT"])).resolves.toEqual({});
  });

  it("fetchQuotes shapes a successful response into {price, currency}", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: { result: [{ meta: { regularMarketPrice: 123.45, currency: "USD" } }] },
      }),
    });
    const quotes = await fetchQuotes(["AAPL"]);
    expect(quotes).toEqual({ AAPL: { price: 123.45, currency: "USD" } });
  });

  it("fetchQuotes skips a symbol whose response is missing price/currency", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ meta: {} }] } }),
    });
    await expect(fetchQuotes(["BROKEN"])).resolves.toEqual({});
  });

  it("fetchFxToEur resolves EUR to 1 without a fetch", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("should not be called for EUR"));
    await expect(fetchFxToEur(["EUR"])).resolves.toEqual({ EUR: 1 });
  });

  it("fetchFxToEur inverts EURUSD=X for USD", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 1.1 } }] } }),
    });
    const fx = await fetchFxToEur(["USD"]);
    expect(fx.USD).toBeCloseTo(1 / 1.1, 6);
  });

  it("fetchFxToEur uses <CUR>EUR=X directly for a non-USD currency", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 1.17 } }] } }),
    });
    const fx = await fetchFxToEur(["GBP"]);
    expect(fx.GBP).toBeCloseTo(1.17, 6);
  });

  it("fetchFxToEur degrades to an empty object (minus EUR) on failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(fetchFxToEur(["USD", "GBP"])).resolves.toEqual({});
  });
});
