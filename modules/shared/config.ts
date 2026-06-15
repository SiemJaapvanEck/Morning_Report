// Centrale configuratie. Alles met een default is via env te overschrijven
// zonder code aan te raken.

export type AiProvider = "xai" | "anthropic";

const DEFAULT_MODELS: Record<AiProvider, { scan: string; deep: string }> = {
  // actieve provider "voor nu" (zie CLAUDE.md): Grok via de xAI-API
  xai: { scan: "grok-4.20-0309-non-reasoning", deep: "grok-4.3" },
  // omschakelbaar zodra er een Anthropic-key is: AI_PROVIDER=anthropic
  anthropic: { scan: "claude-haiku-4-5", deep: "claude-sonnet-4-6" },
};

const provider = (process.env.AI_PROVIDER ?? "xai") as AiProvider;

export const config = {
  provider,
  models: {
    /** Brede scan & classificatie — goedkoop */
    scan: process.env.MODEL_SCAN ?? DEFAULT_MODELS[provider].scan,
    /** Deep-dives & Sol — sterker */
    deep: process.env.MODEL_DEEP ?? DEFAULT_MODELS[provider].deep,
  },

  /**
   * Prijzen in USD per miljoen tokens, omgerekend naar EUR met een vaste
   * veiligheidskoers. Liever iets te hoog geschat dan stilletjes over budget.
   */
  pricing: {
    usdPerEur: 0.9, // conservatief: 1 EUR = 0.90 USD
    perModel: {
      "claude-haiku-4-5": { inputUsd: 1.0, outputUsd: 5.0 },
      "claude-sonnet-4-6": { inputUsd: 3.0, outputUsd: 15.0 },
      // xAI-prijzen per docs.x.ai (juni 2026)
      "grok-4.3": { inputUsd: 1.25, outputUsd: 2.5 },
      "grok-4.20-0309-non-reasoning": { inputUsd: 1.25, outputUsd: 2.5 },
      "grok-4.20-0309-reasoning": { inputUsd: 1.25, outputUsd: 2.5 },
    } as Record<string, { inputUsd: number; outputUsd: number }>,
  },

  budget: {
    /** Plafond per editie in EUR */
    editionCeilingEur: Number(process.env.BUDGET_EDITION_EUR ?? "0.30"),
    /** Vanaf dit aandeel van het plafond schakelt de pipeline terug */
    zuinigVanaf: 0.6,
    minimaalVanaf: 0.85,
  },

  pipeline: {
    /** Max pogingen per stap voordat hij definitief faalt */
    maxAttempts: 3,
    /** Tijdbudget per tick in ms — ruim binnen Vercel's 10s-limiet */
    tickBudgetMs: 7000,
  },

  scan: {
    // Pre-rank gate: most ingested items never reach an edition (~78% waste),
    // so a cheap source-weight × recency × interest score decides which items
    // are worth an LLM scan. Each round scans the top-scored batch of the
    // still-unscanned pool, so batchSize × maxRounds is the top-K we keep —
    // that is the main scan-cost dial. The threshold only drops the genuinely
    // stale/weak tail; user-selected topics are always scanned.
    /** items per LLM scan call; bigger batches amortize the fixed prompt overhead */
    batchSize: Number(process.env.SCAN_BATCH ?? "40"),
    /** floor: items scoring below this skip the LLM (unless user-selected) */
    preRankThreshold: Number(process.env.SCAN_PRERANK_THRESHOLD ?? "0.5"),
    /** cost dial: batchSize × maxRounds = max items scanned (≈280 → ~€0.05/edition) */
    maxRounds: Number(process.env.SCAN_MAX_ROUNDS ?? "7"),
    /** how many fresh, unscanned candidates to load and rank per tick */
    candidatePool: Number(process.env.SCAN_CANDIDATE_POOL ?? "800"),
  },

  ingest: {
    // Media feeds (podcast/video) are evergreen and skip the 48h freshness
    // rule, so an unbounded feed pulls its whole backcatalog (e.g. ~500
    // episodes) straight into the scanner. Cap intake to the newest few.
    /** newest N items kept per podcast/video feed per ingest */
    mediaMaxPerFeed: Number(process.env.INGEST_MEDIA_MAX ?? "3"),
  },

  weather: {
    // Default: Arnhem
    lat: Number(process.env.WEATHER_LAT ?? "51.98"),
    lon: Number(process.env.WEATHER_LON ?? "5.91"),
    plaats: process.env.WEATHER_PLAATS ?? "Arnhem",
  },

  timezone: "Europe/Amsterdam",
} as const;

/** Datum van vandaag (YYYY-MM-DD) in Nederlandse tijd. */
export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Tokens → kosten in EUR voor het gegeven model. */
export function costEur(model: string, inputTokens: number, outputTokens: number): number {
  const prices = config.pricing.perModel[model];
  if (!prices) return 0;
  const usd =
    (inputTokens / 1_000_000) * prices.inputUsd +
    (outputTokens / 1_000_000) * prices.outputUsd;
  return usd / config.pricing.usdPerEur;
}
