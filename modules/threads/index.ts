// News threads — pure logic for matching items to persistent storylines and
// computing what's genuinely new each edition. No DB, no framework imports:
// the pipeline step (modules/pipeline/steps.ts) and the DB helpers that arrive
// in a later phase are the only callers.
//
// Matching is free (entity set-overlap, no LLM). Entities are extracted by the
// existing scan call and stored on items.scan_meta.entities; a thread's
// entities are the denormalized union of the entities it has absorbed.

import type { DestepLens, Thread } from "../shared/types";

/**
 * Normalize an entity string for set comparison: strip diacritics, lowercase,
 * fold punctuation to spaces, collapse whitespace. "São Paulo!" → "sao paulo".
 */
export function normalizeEntity(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard overlap between two entity sets, 0..1. Empty either side → 0. */
export function entityOverlap(a: string[], b: string[]): number {
  const setA = new Set(a.filter(Boolean));
  const setB = new Set(b.filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface ThreadMatch {
  threadId: string;
  /** raw entity overlap, 0..1 (excludes the same-topic ranking bonus) */
  score: number;
}

/** Small bonus so a same-topic thread wins a tie — never crosses the threshold alone. */
const SAME_TOPIC_BONUS = 0.1;

/**
 * Find the best existing thread for one scanned item, by entity overlap above
 * `minOverlap`. A same-topic thread gets a small ranking bonus to break ties.
 * Returns null → the item should open a new thread (or stay a plain item).
 */
export function matchThread(
  itemEntities: string[],
  itemTopicId: string | null,
  threads: Pick<Thread, "id" | "entities" | "topic_id">[],
  minOverlap = 0.34,
): ThreadMatch | null {
  const itemNorm = itemEntities.map(normalizeEntity).filter(Boolean);
  if (itemNorm.length === 0) return null;

  let best: ThreadMatch | null = null;
  let bestRank = -1;
  for (const t of threads) {
    const base = entityOverlap(itemNorm, t.entities.map(normalizeEntity));
    if (base < minOverlap) continue;
    const sameTopic = itemTopicId != null && t.topic_id === itemTopicId;
    const rank = base + (sameTopic ? SAME_TOPIC_BONUS : 0);
    if (rank > bestRank) {
      bestRank = rank;
      best = { threadId: t.id, score: base };
    }
  }
  return best;
}

export interface DeltaItem {
  id: string;
  title: string;
  entities?: string[];
}

export interface ThreadDelta {
  /** entities in the new items not already known to the thread (normalized) */
  newEntities: string[];
  /** headlines of items genuinely new vs what the thread has already seen */
  newHeadlines: string[];
  /** is there enough new substance to warrant an UPDATE this edition? */
  hasNews: boolean;
}

/**
 * Compute what's genuinely new for a thread given today's matched items and
 * the items it has already absorbed. Items already seen are dropped — this is
 * what structurally suppresses duplicates and lets the update "build on" state.
 */
export function computeDelta(
  thread: Pick<Thread, "entities">,
  matchedItems: DeltaItem[],
  seenItemIds: Set<string>,
): ThreadDelta {
  const known = new Set(thread.entities.map(normalizeEntity).filter(Boolean));
  const newItems = matchedItems.filter((it) => !seenItemIds.has(it.id));
  const newEntitySet = new Set<string>();
  for (const it of newItems) {
    for (const e of it.entities ?? []) {
      const n = normalizeEntity(e);
      if (n && !known.has(n)) newEntitySet.add(n);
    }
  }
  const newHeadlines = newItems.map((it) => it.title);
  return {
    newEntities: [...newEntitySet],
    newHeadlines,
    hasNews: newHeadlines.length > 0,
  };
}

/** Union an existing entity set with new entities (normalized, deduped, capped). */
export function mergeEntities(existing: string[], incoming: string[], cap = 40): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...existing, ...incoming]) {
    const n = normalizeEntity(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
      if (out.length >= cap) break;
    }
  }
  return out;
}

// DESTEP lens selection — keyword heuristics so research only uses the lenses
// that actually matter for a story (e.g. a SpaceX IPO → economisch +
// technologisch, not all six). Keywords are matched against the diacritic-
// stripped category/topic/entities haystack.
const LENS_KEYWORDS: Record<DestepLens, string[]> = {
  economisch: [
    "beurs", "markt", "ipo", "aandeel", "stock", "econom", "inflat", "rente",
    "omzet", "winst", "etf", "handel", "trade", "bank", "geld", "valuta",
    "bedrijf", "company", "finance",
  ],
  technologisch: [
    "tech", "ai", "kunstmatige", "software", "chip", "robot", "ruimtevaart",
    "space", "startup", "innovat", "internet", "data", "cyber", "app",
    "quantum",
  ],
  politiek: [
    "politiek", "verkiezing", "regering", "wet", "parlement", "president",
    "minister", "beleid", "sanctie", "oorlog", "election", "government",
    "policy", "coalitie", "kabinet",
  ],
  sociaal: [
    "samenleving", "onderwijs", "gezondheid", "sociale", "cultuur", "protest",
    "arbeid", "work", "education", "health", "society", "migra", "woning",
  ],
  ecologisch: [
    "klimaat", "milieu", "energie", "co2", "duurzaam", "natuur", "climate",
    "environment", "emiss", "stikstof", "fossiel",
  ],
  demografisch: ["bevolking", "vergrijzing", "geboorte", "demograf", "population", "leeftijd"],
};

const LENS_ORDER: DestepLens[] = [
  "economisch", "technologisch", "politiek", "sociaal", "ecologisch", "demografisch",
];

/** Pick the relevant DESTEP lenses for a story (max `max`); never empty. */
export function selectLenses(
  categorySlug: string | null,
  topicName: string | null,
  entities: string[],
  max = 3,
): DestepLens[] {
  const hay = [categorySlug ?? "", topicName ?? "", ...entities]
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const matched = LENS_ORDER.filter((lens) =>
    LENS_KEYWORDS[lens].some((kw) => hay.includes(kw)),
  );
  if (matched.length === 0) return ["sociaal"];
  return matched.slice(0, max);
}

/** Order threads for the Daily Paper body: followed first, then bigger deltas. */
export function orderThreads<T extends { followed: boolean; deltaSize: number }>(
  threads: T[],
): T[] {
  return [...threads].sort(
    (a, b) => Number(b.followed) - Number(a.followed) || b.deltaSize - a.deltaSize,
  );
}
