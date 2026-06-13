// Marktdata per wereldregio via het gratis Yahoo Finance chart-endpoint:
// geen API-key, geen quota → €0 per call. Eén representatieve index per regio,
// maar de lijst is vrij uitbreidbaar: voeg regels toe (meer regio's of meerdere
// indices per regio) en ze worden in dezelfde pipeline-stap parallel opgehaald.
// De bron staat alleen hier zodat 'm wisselen één bestand kost.

import type { MarktIndex, MarktSnapshot } from "../shared/types";
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

async function fetchOne(def: MarktDef): Promise<MarktIndex | null> {
  try {
    const url = `${YAHOO}${encodeURIComponent(def.symbool)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }[] };
    };
    const m = data.chart?.result?.[0]?.meta;
    const p = m?.regularMarketPrice;
    const pc = m?.chartPreviousClose;
    if (typeof p !== "number" || typeof pc !== "number" || pc === 0) return null;
    return {
      regio: def.regio,
      symbool: def.symbool,
      naam: def.naam,
      d: Math.round(((p - pc) / pc) * 10000) / 100, // % met 2 decimalen
    };
  } catch {
    return null; // skip-on-fail: nooit een editie-breker
  }
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
