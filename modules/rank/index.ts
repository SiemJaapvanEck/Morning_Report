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
        },
        required: ["index", "belang", "is_reclame", "topic_index"],
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
      "(topic_index; specifieke onderwerpen winnen van brede) of −1 als niets echt past.",
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
