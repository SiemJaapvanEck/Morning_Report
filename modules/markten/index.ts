// Marktdata per wereldregio via het gratis Yahoo Finance chart-endpoint:
// geen API-key, geen quota → €0 per call. Eén representatieve index per regio,
// maar de lijst is vrij uitbreidbaar: voeg regels toe (meer regio's of meerdere
// indices per regio) en ze worden in dezelfde pipeline-stap parallel opgehaald.
// De bron staat alleen hier zodat 'm wisselen één bestand kost.

import type { FinanceQuote, MarktIndex, MarktSnapshot } from "../shared/types";
import type { RegioCode } from "../shared/regios";

export interface MarktDef {
  regio: RegioCode;
  symbool: string;
  naam: string;
}

// Uitbreidbaar — voeg hier indices toe. Alles wordt in één keer opgehaald.
export const MARKT_INDICES: MarktDef[] = [
  { regio: "na", symbool: "^GSPC", naam: "S&P 500" },
  { regio: "eu", symbool: "^STOXX", naam: "STOXX 600" },
  { regio: "ru", symbool: "IMOEX.ME", naam: "MOEX" },
  { regio: "me", symbool: "^TASI.SR", naam: "Tadawul" },
  { regio: "ap", symbool: "^N225", naam: "Nikkei 225" },
  { regio: "in", symbool: "^NSEI", naam: "Nifty 50" },
  { regio: "af", symbool: "^J203.JO", naam: "JSE All-Share" },
  { regio: "sa", symbool: "^BVSP", naam: "Bovespa" },
];

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/";
// concurrency-cap: houdt het aantal gelijktijdige requests laag, ook als de
// lijst groeit — vriendelijk voor de gratis bron, geen rate-limit-risico.
const MAX_PARALLEL = 8;
const TIMEOUT_MS = 6000;

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  currency?: string;
}

/**
 * Generic keyless Yahoo chart-endpoint fetch, shared by the markten indices
 * and the Personal Finance quote/FX lookups below. Never throws — any
 * network/parse failure resolves to `null` so a caller can skip-on-fail.
 */
async function fetchYahooMeta(symbol: string): Promise<YahooMeta | null> {
  try {
    const url = `${YAHOO}${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { meta?: YahooMeta }[] };
    };
    return data.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null; // skip-on-fail: nooit een editie-breker
  }
}

async function fetchOne(def: MarktDef): Promise<MarktIndex | null> {
  const m = await fetchYahooMeta(def.symbool);
  const p = m?.regularMarketPrice;
  const pc = m?.chartPreviousClose;
  if (typeof p !== "number" || typeof pc !== "number" || pc === 0) return null;
  return {
    regio: def.regio,
    symbool: def.symbool,
    naam: def.naam,
    d: Math.round(((p - pc) / pc) * 10000) / 100, // % met 2 decimalen
  };
}

/**
 * Haalt alle indices uit MARKT_INDICES op (parallel, met concurrency-cap).
 * Een falende index wordt overgeslagen; de stap faalt nooit. Kosten: €0.
 */
export async function fetchMarkten(): Promise<MarktSnapshot> {
  const indices: MarktIndex[] = [];
  for (let i = 0; i < MARKT_INDICES.length; i += MAX_PARALLEL) {
    const chunk = MARKT_INDICES.slice(i, i + MAX_PARALLEL);
    const results = await Promise.all(chunk.map(fetchOne));
    for (const r of results) if (r) indices.push(r);
  }
  return { indices, opgehaald_op: new Date().toISOString() };
}

// ============================================================
// Personal Finance quote/FX fetchers (docs/prd/finance.md, Phase 2).
// Same free keyless Yahoo endpoint, same never-throw/degrade-to-empty
// contract as fetchMarkten above. No pipeline step, no persistence — these
// are called on page render (`force-dynamic`) by the /financien page.
// ============================================================

/**
 * Live price + native currency for each requested Yahoo ticker. Symbols that
 * fail to resolve (unknown ticker, network error, rate-limited, ...) are
 * simply absent from the result — never guessed, never thrown.
 */
export async function fetchQuotes(symbols: string[]): Promise<Record<string, FinanceQuote>> {
  const quotes: Record<string, FinanceQuote> = {};
  for (let i = 0; i < symbols.length; i += MAX_PARALLEL) {
    const chunk = symbols.slice(i, i + MAX_PARALLEL);
    const results = await Promise.all(
      chunk.map(async (symbol) => {
        const m = await fetchYahooMeta(symbol);
        const price = m?.regularMarketPrice;
        const currency = m?.currency;
        if (typeof price !== "number" || !currency) return null;
        return { symbol, quote: { price, currency } as FinanceQuote };
      }),
    );
    for (const r of results) if (r) quotes[r.symbol] = r.quote;
  }
  return quotes;
}

/**
 * Exchange rate to convert 1 unit of each requested currency into EUR.
 * 'EUR' always resolves to 1 without a fetch. USD uses `EURUSD=X` (EUR→USD)
 * inverted; every other currency uses `<CUR>EUR=X` directly (locked
 * decision, PRD Phase 2). A currency whose rate can't be resolved is simply
 * absent from the result — callers must treat a missing key as "unknown",
 * never guess a rate (FX correctness rail).
 */
export async function fetchFxToEur(currencies: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(currencies));
  const fx: Record<string, number> = {};
  for (let i = 0; i < unique.length; i += MAX_PARALLEL) {
    const chunk = unique.slice(i, i + MAX_PARALLEL);
    const results = await Promise.all(
      chunk.map(async (currency) => {
        if (currency === "EUR") return { currency, rate: 1 };
        if (currency === "USD") {
          const m = await fetchYahooMeta("EURUSD=X");
          const rate = m?.regularMarketPrice;
          if (typeof rate !== "number" || rate === 0) return null;
          return { currency, rate: 1 / rate };
        }
        const m = await fetchYahooMeta(`${currency}EUR=X`);
        const rate = m?.regularMarketPrice;
        if (typeof rate !== "number") return null;
        return { currency, rate };
      }),
    );
    for (const r of results) if (r) fx[r.currency] = r.rate;
  }
  return fx;
}
