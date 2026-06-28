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
    /**
     * Hard cap per editie in EUR. The pipeline degrades (zuinig → minimaal →
     * stop) well before this; the cap is the line it must never cross. We aim
     * for noticeably lower than the cap — the threads layer funds richer
     * research by reclaiming broad-scan cost (see scan.maxRounds below).
     */
    editionCeilingEur: Number(process.env.BUDGET_EDITION_EUR ?? "0.15"),
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
    /**
     * cost dial: batchSize × maxRounds = max items scanned. Tightened to 4
     * rounds (40 × 4 = 160 items ≈ €0.03) to reclaim budget for thread-aware
     * deep research — the threads layer guarantees followed topics regardless,
     * so the broad firehose scan no longer has to catch everything.
     */
    maxRounds: Number(process.env.SCAN_MAX_ROUNDS ?? "4"),
    /** how many fresh, unscanned candidates to load and rank per tick */
    candidatePool: Number(process.env.SCAN_CANDIDATE_POOL ?? "800"),
  },

  select: {
    // Cost gate → paper breadth. Most ingested items never reach the paper; the
    // select step ranks the fresh pool per category and assigns bands. Headlines
    // (the "Ook in het nieuws" brief list) are free, so we broaden the tail hard
    // while keeping the paid deep/summary tiers bounded (deep stays governed by
    // budgetPolicy). These knobs are the "more articles than paper" dial.
    /** newest N fresh items loaded into the per-category ranking */
    freshPoolLimit: Number(process.env.SELECT_FRESH_POOL ?? "400"),
    /** how far back "fresh" reaches, in hours */
    freshWindowHours: Number(process.env.SELECT_FRESH_WINDOW_H ?? "48"),
    /** max items kept per category section (the rest of the pool is dropped) */
    maxPerCategory: Number(process.env.SELECT_MAX_PER_CATEGORY ?? "24"),
    /** max paid "summary" cards per section below the deep dives; rest = free headlines */
    maxSummariesPerSection: Number(process.env.SELECT_MAX_SUMMARIES ?? "6"),
  },

  ingest: {
    // Media feeds (podcast/video) are evergreen and skip the 48h freshness
    // rule, so an unbounded feed pulls its whole backcatalog (e.g. ~500
    // episodes) straight into the scanner. Cap intake to the newest few.
    /** newest N items kept per podcast/video feed per ingest */
    mediaMaxPerFeed: Number(process.env.INGEST_MEDIA_MAX ?? "3"),
  },

  threads: {
    // News threads (axis B): how items attach to persistent storylines and when
    // a new storyline is born. Matching/clustering is free (entity-set overlap,
    // no LLM). New threads only open for what the reader follows or for a
    // genuinely big story — never for every headline.
    /** Jaccard entity-overlap to attach an item to an existing thread */
    matchMinOverlap: Number(process.env.THREADS_MATCH_OVERLAP ?? "0.34"),
    /** Looser overlap used to cluster same-day items into one "big topic" */
    bigTopicMinOverlap: Number(process.env.THREADS_CLUSTER_OVERLAP ?? "0.3"),
    /**
     * Cross-source coverage gate: a same-day entity cluster of at least this
     * many items counts as a major story and gets its own thread even when the
     * reader follows neither its topic nor category. Deliberately high so only
     * genuinely broad coverage (an Iran war, a tariffs story) trips it.
     */
    bigTopicMinCluster: Number(process.env.THREADS_BIG_TOPIC_MIN ?? "5"),

    // Mega-threads: a genuinely big, recurring story becomes a PARENT thread
    // that absorbs the smaller threads about it (its timeline dots). The signal
    // is recurrence-across-days (not same-day breadth) plus spanning multiple
    // angles — so a one-day blip or a single-thread topic never graduates.
    /** an anchor entity must appear on at least this many distinct days (rolling window) */
    anchorMinDays: Number(process.env.THREADS_ANCHOR_MIN_DAYS ?? "3"),
    /** how far back to look for recurrence, in days */
    anchorWindowDays: Number(process.env.THREADS_ANCHOR_WINDOW_DAYS ?? "14"),
    /** only form a mega-thread if the anchor spans at least this many child threads */
    anchorMinChildren: Number(process.env.THREADS_ANCHOR_MIN_CHILDREN ?? "3"),
  },

  generate: {
    /**
     * Deep research now feeds the item's full body (content:encoded) instead of a
     * 200-char snippet. This bounds how much of that body reaches the model per
     * item — the main cost knob for "more detail per topic". Excerpt is taken at
     * feed-time, so it can be re-tuned without re-ingesting.
     */
    itemExcerptChars: Number(process.env.DEEP_ITEM_EXCERPT_CHARS ?? "1500"),
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
