// Interessemotor & belang-ranking.
//
// Twee lagen (zie ontwerp §6.1):
// 1. scan: goedkope AI-classificatie per batch (belang 0..1 + reclamecheck)
// 2. prioriteit: interessescore × belang → banden (deep / summary / headline)
//
// De hiërarchische scores (item ← topic ← categorie, bron als multiplier)
// leven in topic_scores; expliciete feedback op een niveau overschrijft dat
// niveau. Cold-start is neutraal (score 0).

import { db, unwrap } from "../shared/db";
import { askAIJson } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { dedupeEntities } from "../threads";
import { REGIO_CODES, REGIO_GEEN, REGIO_NAAM, isRegioCode } from "../shared/regios";
import type { BudgetMode, Item, Topic, TopicScore, Band } from "../shared/types";

// ============================================================
// Scan: belang-classificatie (Haiku, batch)
// ============================================================

interface ScanVerdict {
  index: number;
  belang: number; // 0..1
  is_reclame: boolean;
  /** index in de meegegeven topiclijst; −1 = geen passend topic */
  topic_index: number;
  /** wereldregio waar het nieuws over gaat, of "geen" */
  regio: string;
  /** 2–5 kernentiteiten (eigennamen) uit het item, in normale schrijfwijze */
  entities: string[];
}

const SCAN_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          belang: { type: "number" },
          is_reclame: { type: "boolean" },
          topic_index: { type: "integer" },
          regio: { type: "string", enum: [...REGIO_CODES, REGIO_GEEN] },
          entities: { type: "array", items: { type: "string" } },
        },
        required: ["index", "belang", "is_reclame", "topic_index", "regio", "entities"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

/** Wat de scan per topic nodig heeft om te kunnen matchen. */
export type ScanTopic = Pick<Topic, "id" | "name" | "query_text">;

export interface ScanUitslag {
  belang: number;
  isReclame: boolean;
  /** best passende topic, of null als geen enkel topic past */
  topicId: string | null;
  /** wereldregio waar het nieuws over gaat, of null als geen duidelijke plek */
  regio: string | null;
  /** kernentiteiten (eigennamen) uit het item, ontdubbeld in displayvorm */
  entities: string[];
}

/**
 * Classificeert een batch items op algemeen nieuwsbelang én wijst het best
 * passende topic toe (zo werken topic-voorkeuren — hoe specifiek ook — door
 * in de match-score). Eén call per batch van ~25 — de goedkope brede scan.
 */
export async function scanBatch(
  items: Item[],
  editionId: string,
  stepId?: string,
  topics: ScanTopic[] = [],
): Promise<Map<string, ScanUitslag>> {
  if (items.length === 0) return new Map();

  const lijst = items
    .map((item, i) => `${i}. ${item.title}${item.raw_summary ? ` — ${item.raw_summary.slice(0, 150)}` : ""}`)
    .join("\n");

  const topicLijst = topics
    .map((topic, i) => `${i}. ${topic.name}${topic.query_text ? ` (${topic.query_text})` : ""}`)
    .join("\n");

  const { data } = await askAIJson<{ items: ScanVerdict[] }>({
    tier: "scan",
    editionId,
    stepId,
    maxTokens: 3000,
    jsonSchema: SCAN_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je beoordeelt nieuwsitems voor een persoonlijk ochtendrapport. " +
      "Geef per item een belang-score van 0.0 (triviaal) tot 1.0 (groot nieuws met brede impact). " +
      "Markeer is_reclame=true voor gesponsorde content, advertorials en deals-artikelen — " +
      "officiële persberichten van fabrikanten zijn GEEN reclame. " +
      "Kies per item daarnaast het best passende onderwerp uit de onderwerpenlijst " +
      "(topic_index; specifieke onderwerpen winnen van brede) of −1 als niets echt past. " +
      "Bepaal tot slot de wereldregio waar het nieuws over gáát (niet de bron): " +
      `${REGIO_CODES.map((c) => `${c}=${REGIO_NAAM[c]}`).join(", ")}. ` +
      `Nederland valt onder eu. Gebruik "${REGIO_GEEN}" als er geen duidelijke geografische plek is ` +
      "(bv. algemeen tech-, wetenschap- of marktnieuws). " +
      "Geef tot slot per item 2 tot 5 kernentiteiten (entities): de belangrijkste eigennamen " +
      "— personen, organisaties, bedrijven, plaatsen of producten — die in het item centraal staan, " +
      "in hun normale schrijfwijze (bv. \"SpaceX\", \"Europese Centrale Bank\", \"Tibet\").",
    prompt: `Onderwerpen:\n${topicLijst || "(geen)"}\n\nBeoordeel deze items:\n\n${lijst}`,
  });

  const verdicts = new Map<string, ScanUitslag>();
  for (const verdict of data.items) {
    const item = items[verdict.index];
    if (item) {
      verdicts.set(item.id, {
        belang: Math.max(0, Math.min(1, verdict.belang)),
        isReclame: verdict.is_reclame,
        topicId: topics[verdict.topic_index]?.id ?? null,
        regio: isRegioCode(verdict.regio) ? verdict.regio : null,
        entities: dedupeEntities(verdict.entities ?? []),
      });
    }
  }
  return verdicts;
}

// ============================================================
// Interessescore met overerving
// ============================================================

export interface ScoreContext {
  topicScores: Map<string, number>;    // topic_id → score
  categoryScores: Map<string, number>; // category_id → score
  sourceWeights: Map<string, number>;  // source_id → multiplier
}

export async function loadScoreContext(profileId: string): Promise<ScoreContext> {
  const scores: TopicScore[] = unwrap(
    await db().from("topic_scores").select("*").eq("profile_id", profileId),
  );
  const sources = unwrap(await db().from("sources").select("id, weight"));

  const ctx: ScoreContext = {
    topicScores: new Map(),
    categoryScores: new Map(),
    sourceWeights: new Map(sources.map((s: { id: string; weight: number }) => [s.id, s.weight])),
  };
  for (const score of scores) {
    if (score.target_type === "topic") ctx.topicScores.set(score.target_id, score.score);
    if (score.target_type === "category") ctx.categoryScores.set(score.target_id, score.score);
    if (score.target_type === "source") {
      // bron-feedback komt bóven op het statische gewicht
      const base = ctx.sourceWeights.get(score.target_id) ?? 1.0;
      ctx.sourceWeights.set(score.target_id, base * (1 + score.score));
    }
  }
  return ctx;
}

/**
 * Pure functie: prioriteit van een item.
 * interesse (met overerving topic ← categorie) × belang × bron-multiplier.
 */
export function priority(
  item: Pick<Item, "topic_id" | "category_id" | "source_id" | "importance">,
  ctx: ScoreContext,
): number {
  // overerving: expliciete topic-score wint, anders categorie, anders neutraal
  const interesse =
    (item.topic_id != null ? ctx.topicScores.get(item.topic_id) : undefined) ??
    (item.category_id != null ? ctx.categoryScores.get(item.category_id) : undefined) ??
    0;

  const sourceWeight = item.source_id != null ? (ctx.sourceWeights.get(item.source_id) ?? 1.0) : 1.0;
  const belang = item.importance ?? 0.3;

  // interesse -1..1 → factor 0.25..1.75, zodat "minder hiervan" dempt maar
  // groot nieuws nooit volledig verdwijnt (dat doet de expliciete escalatie)
  const interesseFactor = 1 + interesse * 0.75;
  return belang * interesseFactor * sourceWeight;
}

// ============================================================
// Pre-scan gate: which items are worth an LLM scan at all
// ============================================================
//
// scan_rank is the dominant AI cost, and most ingested items never reach an
// edition. So before spending tokens we score every candidate with signals we
// already have for free — source weight, recency, and interest — and only
// LLM-scan the ones that clear a threshold. Items the user actively selected
// (followed topic/category) are always scanned, so their relevant news is
// never dropped by the gate.

/** Just the fields the pre-rank needs — no importance (that is what we save). */
export type PreRankItem = Pick<Item, "source_id" | "category_id" | "topic_id" | "published_at">;

/**
 * Recency multiplier in [floor, 1]: freshest items keep full weight, decaying
 * linearly toward the floor across the window. A missing date stays neutral.
 */
export function recencyFactor(
  publishedAt: string | null,
  now = Date.now(),
  windowHours = 48,
  floor = 0.3,
): number {
  if (!publishedAt) return 0.5;
  const ageHours = (now - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageHours <= 0) return 1;
  const decayed = 1 - (1 - floor) * (ageHours / windowHours);
  return Math.max(floor, Math.min(1, decayed));
}

/** Did the reader actively select this item's topic or category? */
export function isUserSelected(
  item: PreRankItem,
  followedTopicIds: Set<string>,
  followedCategoryIds: Set<string>,
): boolean {
  return Boolean(
    (item.topic_id && followedTopicIds.has(item.topic_id)) ||
      (item.category_id && followedCategoryIds.has(item.category_id)),
  );
}

/**
 * Pure: cheap pre-scan score (no LLM). Same interest-inheritance shape as
 * priority(), but without importance — higher means more worth scanning.
 */
export function preRankScore(item: PreRankItem, ctx: ScoreContext, now = Date.now()): number {
  const interest =
    (item.topic_id != null ? ctx.topicScores.get(item.topic_id) : undefined) ??
    (item.category_id != null ? ctx.categoryScores.get(item.category_id) : undefined) ??
    0;
  const interestFactor = 1 + interest * 0.75; // -1..1 → 0.25..1.75, mirrors priority()
  const sourceWeight = item.source_id != null ? (ctx.sourceWeights.get(item.source_id) ?? 1.0) : 1.0;
  return sourceWeight * recencyFactor(item.published_at, now) * interestFactor;
}

/**
 * Pure: pick which candidates get an LLM scan, best first. User-selected items
 * are always kept; the rest must clear `threshold`. The caller scans these in
 * batches across requeued ticks (already-scanned items drop out of the pool).
 */
export function selectForScan<T extends PreRankItem & { id: string }>(
  candidates: T[],
  ctx: ScoreContext,
  followedTopicIds: Set<string>,
  followedCategoryIds: Set<string>,
  threshold: number,
  now = Date.now(),
): T[] {
  return candidates
    .map((item) => ({
      item,
      forced: isUserSelected(item, followedTopicIds, followedCategoryIds),
      score: preRankScore(item, ctx, now),
    }))
    .filter((entry) => entry.forced || entry.score >= threshold)
    .sort((a, b) => Number(b.forced) - Number(a.forced) || b.score - a.score)
    .map((entry) => entry.item);
}

// ============================================================
// Kostenpoort: prioriteit → band
// ============================================================

/**
 * Pure functie: verdeelt gerangschikte items over banden, rekening houdend
 * met de budget-modus. Topband = deep-dive, midden = samenvatting,
 * onderkant = alleen kop.
 */
export function assignBands(
  ranked: { id: string; priority: number }[],
  mode: BudgetMode,
  maxSummaries = 5,
): Map<string, Band> {
  const policy = budgetPolicy[mode];
  const bands = new Map<string, Band>();
  ranked.forEach((entry, i) => {
    if (i < policy.deepDivesPerSectie && entry.priority >= 0.5) {
      bands.set(entry.id, "deep");
    } else if (i < policy.deepDivesPerSectie + maxSummaries && policy.samenvattingMaxTokens > 0) {
      bands.set(entry.id, "summary");
    } else {
      bands.set(entry.id, "headline");
    }
  });
  return bands;
}

// ============================================================
// Feedback verwerken → scores bijwerken
// ============================================================

/** Pure functie: rating (1..5) → score-delta. 3 = neutraal. */
export function ratingToDelta(rating: number): number {
  return (rating - 3) * 0.15; // 1→-0.30, 2→-0.15, 3→0, 4→+0.15, 5→+0.30
}

export async function applyFeedback(
  profileId: string,
  targetType: "topic" | "category" | "source",
  targetId: string,
  rating: number,
): Promise<void> {
  const delta = ratingToDelta(rating);
  const existing = await db()
    .from("topic_scores")
    .select("score")
    .eq("profile_id", profileId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  const current = existing.data?.score ?? 0;
  const next = Math.max(-1, Math.min(1, current + delta));

  const { error } = await db().from("topic_scores").upsert(
    {
      profile_id: profileId,
      target_type: targetType,
      target_id: targetId,
      score: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,target_type,target_id" },
  );
  if (error) throw new Error(`Feedback: ${error.message}`);
}
