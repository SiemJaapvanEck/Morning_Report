// News threads — matching items to persistent storylines and computing what's
// genuinely new each edition. The top of this file is pure (no framework, no
// DB) and fully unit-tested; the DB helpers at the bottom (Supabase via the
// shared client, the same pure/DB split as modules/rank) are only called by the
// pipeline step in modules/pipeline/steps.ts.
//
// Matching and clustering are free (entity set-overlap, no LLM). Entities are
// extracted by the existing scan call and stored on items.scan_meta.entities; a
// thread's entities are the denormalized union of the entities it has absorbed.

import { db, unwrap } from "../shared/db";
import type { DestepLens, Thread, ThreadStatus, ThreadUpdate } from "../shared/types";

/**
 * Curated alias map: surface-string variants of the SAME real-world entity that
 * the raw normalizer can't fold on its own (given names, legal suffixes, language
 * variants, abbreviations). Keys and values are already base-normalized (the
 * output of the diacritic/punctuation/case pass). Kept small and deliberate to
 * avoid false merges — extend only for variants seen in real data.
 */
export const ENTITY_ALIASES: Record<string, string> = {
  "donald trump": "trump",
  "trump administration": "trump",
  "united states": "us",
  "united states of america": "us",
  "u s": "us",
  "u s a": "us",
  "verenigde staten": "us",
  oekraine: "ukraine",
  rusland: "russia",
  "us federal reserve": "federal reserve",
  "u s federal reserve": "federal reserve",
  "the federal reserve": "federal reserve",
  fed: "federal reserve",
  "warner bros discovery": "warner bros",
  libanon: "lebanon",
  "verenigd koninkrijk": "uk",
  "united kingdom": "uk",
  "europese unie": "eu",
  "european union": "eu",
};

/**
 * Normalize an entity string for set comparison: strip diacritics, lowercase,
 * fold punctuation to spaces, collapse whitespace, then fold known aliases to a
 * single canonical form. "São Paulo!" → "sao paulo"; "Donald Trump" → "trump".
 */
export function normalizeEntity(raw: string): string {
  const base = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
  return ENTITY_ALIASES[base] ?? base;
}

/**
 * Bare country/city datelines that touch every kind of news — too generic to be
 * a single "storyline", so they never open a thread (they'd become catch-all
 * buckets). Coherent place-stories (Israel, Ukraine, Iran, Gaza, Venezuela) are
 * deliberately NOT here. Values are canonical normalized forms.
 */
export const DATELINE_STOPLIST = new Set<string>([
  "us",
  "uk",
  "eu",
  "france",
  "germany",
  "china",
  "kyiv",
  "moscow",
  "washington",
  "brussels",
  "nederland",
  "netherlands",
  "europe",
]);

/** Whether a (normalized) entity is allowed to anchor a thread — false for datelines. */
export function isAnchorableEntity(norm: string): boolean {
  return norm.length > 0 && !DATELINE_STOPLIST.has(norm);
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

/**
 * Dedupe raw scan entities for storage on an item, keeping the human-readable
 * display form (we show these in the archive UI) — "SpaceX", not "spacex".
 * Comparison is case/diacritic-insensitive via normalizeEntity, but the first
 * display form wins; empties are dropped and the count is capped. Matching and
 * thread state still normalize at use-time, so storing display form is safe.
 */
export function dedupeEntities(raw: string[], cap = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const display = r.trim();
    if (!display) continue;
    const key = normalizeEntity(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(display);
    if (out.length >= cap) break;
  }
  return out;
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

/**
 * The single dominant DESTEP lens across a set of stories — the mode of each
 * story's primary lens, tie-broken by LENS_ORDER. Colors a mega-thread by its
 * main sector. Empty input → "sociaal" (matches selectLenses' fallback).
 */
export function dominantLens(perStoryLenses: DestepLens[][]): DestepLens {
  const votes = new Map<DestepLens, number>();
  for (const lenses of perStoryLenses) {
    const primary = lenses[0];
    if (primary) votes.set(primary, (votes.get(primary) ?? 0) + 1);
  }
  let best: DestepLens = "sociaal";
  let bestCount = 0;
  for (const lens of LENS_ORDER) {
    const count = votes.get(lens) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = lens;
    }
  }
  return best;
}

/** Order threads for the Daily Paper body: followed first, then bigger deltas. */
export function orderThreads<T extends { followed: boolean; deltaSize: number }>(
  threads: T[],
): T[] {
  return [...threads].sort(
    (a, b) => Number(b.followed) - Number(a.followed) || b.deltaSize - a.deltaSize,
  );
}

// ============================================================
// Big-topic detection — cross-source coverage clustering
// ============================================================

/**
 * Connected-component clustering of items by entity overlap. Two items are
 * joined when their normalized entity sets overlap ≥ `minOverlap`; a cluster is
 * a connected component (so coverage links transitively — A~B, B~C ⇒ {A,B,C}
 * even when A and C barely overlap). Returns only components of at least
 * `minSize` members, each a list of item ids in input order. Items with no
 * entities never join and drop out as singletons.
 */
export function clusterByEntities(
  items: { id: string; entities: string[] }[],
  minOverlap: number,
  minSize: number,
): string[][] {
  const n = items.length;
  const norm = items.map((it) => it.entities.map(normalizeEntity).filter(Boolean));

  // union-find with path compression
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) [x, parent[x]] = [parent[x], r];
    return r;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (entityOverlap(norm[i], norm[j]) >= minOverlap) parent[find(i)] = find(j);
    }
  }

  const groups = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = groups.get(root) ?? [];
    arr.push(items[i].id);
    groups.set(root, arr);
  }
  return [...groups.values()].filter((g) => g.length >= minSize);
}

// ============================================================
// Entity-anchored thread planning — every thread is one self-contained story
// anchored on a single entity (Ford, PlayStation, Israel). A thread is born
// when its entity recurs across days, breaks as a big cross-source story, or is
// followed/tracked by the reader; items attach by simply containing the anchor.
// ============================================================

/** One edition item as the thread planner sees it. */
export interface ThreadCandidate {
  itemId: string;
  title: string;
  topicId: string | null;
  categoryId: string | null;
  entities: string[];
  importance: number | null;
  /** is this a top ("deep") item this edition — the significance bar for a followed thread */
  deep: boolean;
}

/** Why an entity earned its own standalone thread this edition. */
export type AnchorReason = "recurring" | "big_topic" | "tracked" | "followed";

/** A normalized anchor entity that qualifies for its own flat (self-contained) thread. */
export interface AnchorSpec {
  /** normalized anchor entity — the thread's identity and its item-match key */
  entity: string;
  /** human display form, used as the thread's seed title */
  display: string;
  reason: AnchorReason;
}

/** The first usable entity of an item (its most salient), display + normalized; null if none. */
export function primaryEntity(entities: string[]): { entity: string; display: string } | null {
  for (const raw of entities) {
    const display = raw.trim();
    const entity = normalizeEntity(display);
    if (entity) return { entity, display };
  }
  return null;
}

/**
 * The most frequent normalized entity across a set of items, with a display
 * form. Ties break toward the entity seen first (stable order). Null when no
 * item carries any entity.
 */
export function dominantEntity(
  items: { entities: string[] }[],
): { entity: string; display: string } | null {
  const count = new Map<string, number>();
  const display = new Map<string, string>();
  const order: string[] = [];
  for (const it of items) {
    for (const raw of it.entities) {
      const d = raw.trim();
      const norm = normalizeEntity(d);
      if (!norm) continue;
      if (!count.has(norm)) {
        count.set(norm, 0);
        display.set(norm, d);
        order.push(norm);
      }
      count.set(norm, count.get(norm)! + 1);
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const e of order) {
    const n = count.get(e)!;
    if (n > bestN) {
      bestN = n;
      best = e;
    }
  }
  return best ? { entity: best, display: display.get(best)! } : null;
}

/**
 * Big-topic anchors: cluster same-day items by entity overlap; each cluster of
 * at least `minCluster` items contributes its dominant entity as an instant-on
 * anchor. This is how a breaking story gets a thread the day it breaks, before
 * it has had time to recur across the days `detectAnchors` needs.
 */
export function bigTopicAnchors(
  items: { id: string; entities: string[] }[],
  minOverlap: number,
  minCluster: number,
): AnchorSpec[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  const out: AnchorSpec[] = [];
  for (const cluster of clusterByEntities(items, minOverlap, minCluster)) {
    const members = cluster.map((id) => byId.get(id)!).filter(Boolean);
    const dom = dominantEntity(members);
    if (dom) out.push({ entity: dom.entity, display: dom.display, reason: "big_topic" });
  }
  return out;
}

/**
 * Personal anchors: an item on a tracked topic (any significance) or a followed
 * + deep item turns its primary entity into an anchor. Tracking is the stronger,
 * explicit signal and needs neither a follow nor the deep band; a follow needs
 * the deep band so an ordinary followed headline does not spawn a thread.
 */
export function personalAnchors(
  candidates: ThreadCandidate[],
  followedTopicIds: Set<string>,
  followedCategoryIds: Set<string>,
  trackedTopicIds: Set<string>,
): AnchorSpec[] {
  const out: AnchorSpec[] = [];
  for (const c of candidates) {
    const tracked = c.topicId != null && trackedTopicIds.has(c.topicId);
    const followed =
      c.deep &&
      ((c.topicId != null && followedTopicIds.has(c.topicId)) ||
        (c.categoryId != null && followedCategoryIds.has(c.categoryId)));
    if (!tracked && !followed) continue;
    const p = primaryEntity(c.entities);
    if (p) out.push({ entity: p.entity, display: p.display, reason: tracked ? "tracked" : "followed" });
  }
  return out;
}

const ANCHOR_PRIORITY: Record<AnchorReason, number> = {
  recurring: 0,
  big_topic: 1,
  tracked: 2,
  followed: 3,
};

/**
 * Merge anchor specs from the different birth paths, keyed by normalized entity.
 * When several paths propose the same entity, the highest-priority reason wins
 * (recurring > big_topic > tracked > followed) and keeps its display form.
 */
export function mergeAnchors(...lists: AnchorSpec[][]): AnchorSpec[] {
  const best = new Map<string, AnchorSpec>();
  for (const list of lists) {
    for (const a of list) {
      if (!a.entity) continue;
      const cur = best.get(a.entity);
      if (!cur || ANCHOR_PRIORITY[a.reason] < ANCHOR_PRIORITY[cur.reason]) best.set(a.entity, a);
    }
  }
  return [...best.values()];
}

/**
 * The single best existing anchor thread for an item: the thread whose anchor
 * entity is contained in the item's entities and appears earliest in the item's
 * (salience-ordered) entity list. Ties break by thread id for determinism. Null
 * → the item joins no existing thread. One item links to at most one thread, so
 * the downstream deep-article path stays one-update-per-thread.
 */
export function matchByAnchor(
  itemEntities: string[],
  anchorThreads: { id: string; anchor_entity: string | null }[],
): string | null {
  const norm = itemEntities.map(normalizeEntity);
  let best: { id: string; rank: number } | null = null;
  for (const t of anchorThreads) {
    if (!t.anchor_entity) continue;
    const rank = norm.indexOf(t.anchor_entity);
    if (rank < 0) continue;
    if (!best || rank < best.rank || (rank === best.rank && t.id < best.id)) {
      best = { id: t.id, rank };
    }
  }
  return best?.id ?? null;
}

// ============================================================
// Storyline hierarchy — a big thread (umbrella, anchored on a recurring entity
// like "anthropic") branches into storylines: child threads each anchored on a
// SECONDARY facet entity ("fable", "ipo") that co-occurs with the big anchor.
// Storylines are threads (parent_thread_id → big thread), so thread_items carries
// item↔storyline links. Linking is many-to-many: an item about several facets
// links to every matching storyline. All pure; the pipeline step (Phase D2) is
// the only caller.
// ============================================================

/** A candidate storyline: a secondary facet entity recurring under a big anchor. */
export interface StorylineFacet {
  /** normalized facet entity — the storyline's anchor and its item-match key */
  entity: string;
  /** human display form, used as the storyline's seed title */
  display: string;
  /** how many of the big thread's items carry this facet (its recurrence) */
  count: number;
}

/**
 * The secondary facet entities that qualify as storylines under a big-thread
 * anchor. Over the items linked to the big thread, count every OTHER anchorable
 * entity that co-occurs with the big anchor (deduped within an item so one
 * article counts once), and keep those meeting `minItems`. The big anchor itself,
 * bare datelines, and any entity in `exclude` (used to skip other big anchors —
 * they're sibling umbrellas, not sub-storylines) are dropped. Sorted by recurrence
 * desc, ties by first-seen for stability.
 */
export function storylineFacets(
  bigAnchor: string,
  items: { entities: string[] }[],
  minItems: number,
  exclude?: Set<string>,
): StorylineFacet[] {
  const count = new Map<string, number>();
  const display = new Map<string, string>();
  const order: string[] = [];
  for (const it of items) {
    const seen = new Set<string>();
    for (const raw of it.entities) {
      const d = raw.trim();
      const norm = normalizeEntity(d);
      if (!norm || norm === bigAnchor || seen.has(norm) || !isAnchorableEntity(norm)) continue;
      // Another actor that is itself a big-thread anchor is a sibling umbrella,
      // not a sub-storyline of this one — skip it (avoids circular nesting).
      if (exclude?.has(norm)) continue;
      seen.add(norm);
      if (!count.has(norm)) {
        count.set(norm, 0);
        display.set(norm, d);
        order.push(norm);
      }
      count.set(norm, count.get(norm)! + 1);
    }
  }
  const rank = new Map(order.map((e, i) => [e, i]));
  const out: StorylineFacet[] = [];
  for (const e of order) {
    if (count.get(e)! >= minItems) out.push({ entity: e, display: display.get(e)!, count: count.get(e)! });
  }
  out.sort((a, b) => b.count - a.count || rank.get(a.entity)! - rank.get(b.entity)!);
  return out;
}

/**
 * Every storyline an item belongs to under its big thread: the child threads
 * whose facet (anchor_entity) is present in the item's entities. The caller has
 * already matched the item to the big thread, so containment of the big anchor is
 * assumed; here we fan out to ALL matching facets (many-to-many) — an item about
 * both Fable and the IPO links to both storylines.
 */
export function matchStorylines(
  itemEntities: string[],
  storylineThreads: { id: string; anchor_entity: string | null }[],
): string[] {
  const norm = new Set(itemEntities.map(normalizeEntity).filter(Boolean));
  const out: string[] = [];
  for (const t of storylineThreads) {
    if (t.anchor_entity && norm.has(t.anchor_entity)) out.push(t.id);
  }
  return out;
}

/**
 * Whether a big thread should split into storylines: only once at least
 * `minFacets` recurring facets have emerged under it. Below the bar it stays a
 * single flat storyline (today's behaviour), so small threads never fragment.
 */
export function shouldPromote(facets: StorylineFacet[], minFacets = 2): boolean {
  return facets.length >= minFacets;
}

/** A thread eligible for a generation update this edition (pure selection input). */
export interface ThreadJobCandidate {
  threadId: string;
  /** the reader follows this thread (drives priority under the cap) */
  followed: boolean;
  /** genuinely new items on this thread this edition */
  newItemCount: number;
}

/**
 * Phase D3 — pick the next thread to advance this edition, or null when the
 * per-edition cap is spent or nothing is left. Under the storyline model many
 * threads can each earn an update, so a cap bounds AI cost; within it, priority
 * is ACTIVITY-based: followed-first, then busier threads (more new items today),
 * then a stable id tiebreak so the requeue loop is deterministic. Deliberately
 * type-neutral (no umbrella/storyline/flat preference): storylines accumulate the
 * day's items so they naturally win over trivial one-item flat threads — an
 * earlier umbrella-before-storyline rule starved them (verified 1 Jul 2026).
 */
export function selectNextThreadJob(
  candidates: ThreadJobCandidate[],
  opts: { cap: number; advancedCount: number },
): string | null {
  if (opts.advancedCount >= opts.cap) return null;
  const ordered = [...candidates].sort((a, b) => {
    if (a.followed !== b.followed) return a.followed ? -1 : 1;
    if (a.newItemCount !== b.newItemCount) return b.newItemCount - a.newItemCount;
    return a.threadId < b.threadId ? -1 : a.threadId > b.threadId ? 1 : 0;
  });
  return ordered[0]?.threadId ?? null;
}

/**
 * Phase D3 — compose an umbrella's read-side rollup from its own general-bucket
 * ("Algemeen") state plus each storyline's state. Compute-on-read for the Phase E
 * hero: it does NOT overwrite the umbrella's own `state`. Child states that are
 * blank are skipped; the anchor is capitalized as a short label.
 */
export function aggregateUmbrellaState(
  umbrellaState: string | null,
  children: { anchor: string; state: string | null }[],
): string {
  const parts: string[] = [];
  const general = umbrellaState?.trim();
  if (general) parts.push(`Algemeen: ${general}`);
  for (const c of children) {
    const s = c.state?.trim();
    if (!s) continue;
    const label = c.anchor.trim() || "Verhaallijn";
    parts.push(`${label.charAt(0).toUpperCase()}${label.slice(1)}: ${s}`);
  }
  return parts.join("\n\n");
}

/**
 * Resolve a new thread's topic/category from today's items that carry its anchor
 * entity: the most common non-null topic_id / category_id among them (mode, ties
 * toward the first item seen). This lets the archive filter the thread by one of
 * the seven content categories even though its identity is just an entity.
 */
export function resolveThreadMeta(
  anchorEntity: string,
  candidates: ThreadCandidate[],
): { topicId: string | null; categoryId: string | null } {
  const members = candidates.filter((c) => c.entities.map(normalizeEntity).includes(anchorEntity));
  const mode = (vals: (string | null)[]): string | null => {
    const count = new Map<string, number>();
    const order: string[] = [];
    for (const v of vals) {
      if (!v) continue;
      if (!count.has(v)) {
        count.set(v, 0);
        order.push(v);
      }
      count.set(v, count.get(v)! + 1);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const v of order) {
      if (count.get(v)! > bestN) {
        bestN = count.get(v)!;
        best = v;
      }
    }
    return best;
  };
  return {
    topicId: mode(members.map((m) => m.topicId)),
    categoryId: mode(members.map((m) => m.categoryId)),
  };
}

// ============================================================
// Recurrence detection — the main thread-birth signal
// ============================================================

/** Per normalized entity: the distinct days it appeared, total item mentions, and a display form. */
export type EntityDays = Map<string, { days: Set<string>; count: number; display: string }>;

/**
 * Recurring anchor entities = those that appear across at least `minDays`
 * distinct days AND in at least `minItems` items in the window. Recurrence marks
 * a story that "keeps coming back"; the volume floor (`minItems`) is what keeps
 * a thin one-off — an entity named once on three separate days — from becoming a
 * thread. Returns the normalized entity plus a display form for the thread title.
 */
export function detectAnchors(
  entityDays: EntityDays,
  minDays: number,
  minItems: number,
): { entity: string; display: string }[] {
  const out: { entity: string; display: string }[] = [];
  for (const [norm, info] of entityDays) {
    if (info.days.size >= minDays && info.count >= minItems) {
      out.push({ entity: norm, display: info.display });
    }
  }
  return out;
}

// ============================================================
// DB helpers (Supabase) — only the pipeline step calls these
// ============================================================

/** Active (non-closed) threads of a profile, with what matching + anchoring need. */
export async function loadActiveThreads(
  profileId: string,
): Promise<Pick<Thread, "id" | "entities" | "topic_id" | "category_id" | "anchor_entity" | "parent_thread_id">[]> {
  return unwrap(
    await db()
      .from("threads")
      .select("id, entities, topic_id, category_id, anchor_entity, parent_thread_id")
      .eq("profile_id", profileId)
      .neq("status", "closed"),
  );
}

/** Item ids already linked to a thread in this edition — the idempotency skip set. */
export async function loadLinkedItemIds(editionId: string): Promise<Set<string>> {
  const rows = unwrap(
    await db().from("thread_items").select("item_id").eq("edition_id", editionId),
  ) as { item_id: string }[];
  return new Set(rows.map((r) => r.item_id));
}

/** Today's edition items as thread candidates (entities from scan_meta). */
export async function loadEditionCandidates(editionId: string): Promise<ThreadCandidate[]> {
  const rows = unwrap(
    await db()
      .from("edition_items")
      .select("item_id, band, items(title, topic_id, category_id, importance, scan_meta)")
      .eq("edition_id", editionId),
  ) as unknown as {
    item_id: string;
    band: string | null;
    items: {
      title: string;
      topic_id: string | null;
      category_id: string | null;
      importance: number | null;
      scan_meta: { entities?: string[] } | null;
    } | null;
  }[];

  const candidates: ThreadCandidate[] = [];
  for (const row of rows) {
    if (!row.items) continue;
    candidates.push({
      itemId: row.item_id,
      title: row.items.title,
      topicId: row.items.topic_id,
      categoryId: row.items.category_id,
      entities: row.items.scan_meta?.entities ?? [],
      importance: row.items.importance,
      deep: row.band === "deep",
    });
  }
  return candidates;
}

/** Insert a new thread; returns its id. */
export async function insertThread(input: {
  profileId: string;
  topicId: string | null;
  categoryId: string | null;
  title: string;
  entities: string[];
  status: ThreadStatus;
  /** null for a thread created out-of-band (e.g. the split script) before any edition touch */
  lastEditionId: string | null;
  lastSeenAt: string;
  /** the normalized anchor entity — the big anchor for an umbrella, the facet for a storyline */
  anchorEntity?: string;
  /** set for a storyline (child) thread: the id of its big (umbrella) thread */
  parentThreadId?: string;
}): Promise<string> {
  const row = unwrap(
    await db()
      .from("threads")
      .insert({
        profile_id: input.profileId,
        topic_id: input.topicId,
        category_id: input.categoryId,
        title: input.title,
        entities: input.entities,
        status: input.status,
        anchor_entity: input.anchorEntity ?? null,
        parent_thread_id: input.parentThreadId ?? null,
        last_edition_id: input.lastEditionId,
        last_seen_at: input.lastSeenAt,
      })
      .select("id")
      .single(),
  ) as { id: string };
  return row.id;
}

/**
 * Per-entity recurrence map over the profile's recent edition items — the input
 * to detectAnchors. Tracks the distinct days an entity appeared and how many
 * items mentioned it (the volume floor). Entities live on
 * items.scan_meta.entities (display form); the edition date supplies the "day".
 */
export async function loadEntityDays(profileId: string, windowDays: number): Promise<EntityDays> {
  const cutoff = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const rows = unwrap(
    await db()
      .from("edition_items")
      .select("items(scan_meta), editions!inner(date, profile_id)")
      .eq("editions.profile_id", profileId)
      .gte("editions.date", cutoff),
  ) as unknown as {
    items: { scan_meta: { entities?: string[] } | null } | null;
    editions: { date: string } | null;
  }[];

  const map: EntityDays = new Map();
  for (const r of rows) {
    const date = r.editions?.date;
    if (!date) continue;
    // Dedupe within one item so a single article counts once toward volume.
    const seen = new Set<string>();
    for (const raw of r.items?.scan_meta?.entities ?? []) {
      const norm = normalizeEntity(raw);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      const e = map.get(norm) ?? { days: new Set<string>(), count: 0, display: raw };
      e.days.add(date);
      e.count += 1;
      map.set(norm, e);
    }
  }
  return map;
}

/**
 * Per-item entity lists for each of the given threads (their full linked
 * history), keyed by thread id — the input to storyline-facet detection. Item-id
 * lookups are chunked to stay under the URL length limit (same guard that bit
 * listStories). A thread with no linked items simply doesn't appear in the map.
 */
export async function loadThreadItemEntities(threadIds: string[]): Promise<Map<string, string[][]>> {
  const out = new Map<string, string[][]>();
  if (threadIds.length === 0) return out;
  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id").in("thread_id", threadIds),
  ) as { thread_id: string; item_id: string }[];
  if (links.length === 0) return out;

  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const entitiesByItem = new Map<string, string[]>();
  const chunk = 200;
  for (let i = 0; i < itemIds.length; i += chunk) {
    const rows = unwrap(
      await db().from("items").select("id, scan_meta").in("id", itemIds.slice(i, i + chunk)),
    ) as { id: string; scan_meta: { entities?: string[] } | null }[];
    for (const r of rows) entitiesByItem.set(r.id, r.scan_meta?.entities ?? []);
  }
  for (const l of links) {
    const ents = entitiesByItem.get(l.item_id);
    if (!ents) continue;
    const arr = out.get(l.thread_id) ?? [];
    arr.push(ents);
    out.set(l.thread_id, arr);
  }
  return out;
}

/** Upsert thread↔item links; unique(thread_id,item_id) + ignore makes it re-run safe. */
export async function linkThreadItems(
  links: { threadId: string; itemId: string; editionId: string | null }[],
): Promise<void> {
  if (links.length === 0) return;
  const { error } = await db()
    .from("thread_items")
    .upsert(
      links.map((l) => ({ thread_id: l.threadId, item_id: l.itemId, edition_id: l.editionId })),
      { onConflict: "thread_id,item_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`linkThreadItems: ${error.message}`);
}

/** Merge new entities into a thread and mark it active/seen this edition. */
export async function touchThread(
  threadId: string,
  entities: string[],
  lastEditionId: string,
  lastSeenAt: string,
): Promise<void> {
  const { error } = await db()
    .from("threads")
    .update({
      entities,
      status: "active",
      last_edition_id: lastEditionId,
      last_seen_at: lastSeenAt,
    })
    .eq("id", threadId);
  if (error) throw new Error(`touchThread: ${error.message}`);
}

// ============================================================
// Phase 4 — thread-aware generation helpers
// ============================================================

/** Everything the generate step needs to write one thread's update this edition. */
export interface ThreadUpdateJob {
  threadId: string;
  title: string;
  state: string | null;
  topicId: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  topicName: string | null;
  threadEntities: string[];
  /** storyline facet label (this thread's anchor) when it's a child; null for umbrellas/flat threads */
  facet: string | null;
  /** the parent umbrella's short label (anchor/title) when this is a storyline; null otherwise */
  umbrellaTitle: string | null;
  /**
   * this edition's deep edition_item ids of this thread where the update body lands —
   * only those still blank (Phase D3 primary-wins dedupe: a shared item already written
   * by an earlier storyline is excluded here, but stays in newItems so this thread's
   * state still advances).
   */
  deepEditionItemIds: string[];
  /** today's items linked to this thread — all genuinely new (unique(thread_id,item_id)) */
  newItems: {
    id: string;
    title: string;
    summary: string | null;
    /** full article body (plain text) for deep research, or null for snippet-only feeds */
    content: string | null;
    url: string | null;
    entities: string[];
  }[];
}

/**
 * The next thread to advance this edition, or null when the per-edition cap is
 * spent or nothing is left. Storyline-aware (Phase D3): items are multi-linked, so
 * we group this edition's links per thread and pick one thread per call (the
 * requeue model), advancing each thread's state at most once via the
 * `state_edition_id` guard. `deepEditionItemIds` carries only the still-blank deep
 * items (primary-wins: a shared item already written by an earlier storyline is
 * left out of the write set but stays in `newItems`, so this thread's state still
 * advances). Priority + cap live in the pure `selectNextThreadJob`.
 */
export async function nextThreadUpdateJob(
  editionId: string,
  profileId: string,
  cap: number,
): Promise<ThreadUpdateJob | null> {
  const deepRows = unwrap(
    await db()
      .from("edition_items")
      .select("id, item_id, summary_text")
      .eq("edition_id", editionId)
      .eq("band", "deep"),
  ) as { id: string; item_id: string; summary_text: string | null }[];
  if (deepRows.length === 0) return null;
  const deepByItem = new Map(deepRows.map((d) => [d.item_id, { id: d.id, summaryText: d.summary_text }]));

  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id").eq("edition_id", editionId),
  ) as { thread_id: string; item_id: string }[];
  if (links.length === 0) return null;

  // Group this edition's items by thread (many-to-many: one item may feed several storylines).
  const itemsByThread = new Map<string, Set<string>>();
  for (const l of links) {
    const s = itemsByThread.get(l.thread_id) ?? new Set<string>();
    s.add(l.item_id);
    itemsByThread.set(l.thread_id, s);
  }

  // Load each touched thread's meta + the per-thread state guard.
  const threadRows = unwrap(
    await db()
      .from("threads")
      .select("id, title, state, state_edition_id, topic_id, category_id, entities, parent_thread_id, anchor_entity")
      .in("id", [...itemsByThread.keys()]),
  ) as {
    id: string;
    title: string;
    state: string | null;
    state_edition_id: string | null;
    topic_id: string | null;
    category_id: string | null;
    entities: string[];
    parent_thread_id: string | null;
    anchor_entity: string | null;
  }[];
  const threadById = new Map(threadRows.map((t) => [t.id, t]));

  // Followed threads get priority under the cap.
  const followRows = unwrap(
    await db()
      .from("follow_marks")
      .select("target_id")
      .eq("profile_id", profileId)
      .eq("target_type", "thread")
      .eq("active", true),
  ) as { target_id: string }[];
  const followed = new Set(followRows.map((f) => f.target_id));

  // Candidate = has ≥1 deep item this edition and not yet advanced this edition.
  const candidates: ThreadJobCandidate[] = [];
  for (const [threadId, itemSet] of itemsByThread) {
    const t = threadById.get(threadId);
    if (!t || t.state_edition_id === editionId) continue;
    if (![...itemSet].some((id) => deepByItem.has(id))) continue;
    candidates.push({
      threadId,
      followed: followed.has(threadId),
      newItemCount: itemSet.size,
    });
  }
  if (candidates.length === 0) return null;

  // Cap on AI thread-updates per edition: how many threads already advanced?
  const advancedRows = unwrap(
    await db().from("threads").select("id").eq("state_edition_id", editionId),
  ) as { id: string }[];
  const chosen = selectNextThreadJob(candidates, { cap, advancedCount: advancedRows.length });
  if (!chosen) return null;

  const thread = threadById.get(chosen)!;
  const todayItemIds = [...itemsByThread.get(chosen)!];
  // Primary-wins: write body only to this thread's still-blank deep items.
  const deepEditionItemIds = todayItemIds
    .map((id) => deepByItem.get(id))
    .filter((d): d is { id: string; summaryText: string | null } => !!d && !d.summaryText)
    .map((d) => d.id);

  let categorySlug: string | null = null;
  let topicName: string | null = null;
  if (thread.category_id) {
    const c = unwrap(
      await db().from("categories").select("slug").eq("id", thread.category_id).maybeSingle(),
    ) as { slug: string } | null;
    categorySlug = c?.slug ?? null;
  }
  if (thread.topic_id) {
    const t = unwrap(
      await db().from("topics").select("name").eq("id", thread.topic_id).maybeSingle(),
    ) as { name: string } | null;
    topicName = t?.name ?? null;
  }

  // Storyline framing: this thread's anchor is the facet; the parent umbrella's
  // anchor (preferred over its possibly-headline title) is the umbrella label.
  const facet = thread.parent_thread_id ? thread.anchor_entity : null;
  let umbrellaTitle: string | null = null;
  if (thread.parent_thread_id) {
    const parent = unwrap(
      await db().from("threads").select("title, anchor_entity").eq("id", thread.parent_thread_id).maybeSingle(),
    ) as { title: string; anchor_entity: string | null } | null;
    umbrellaTitle = parent?.anchor_entity ?? parent?.title ?? null;
  }

  const items = unwrap(
    await db().from("items").select("id, title, raw_summary, content, url, scan_meta").in("id", todayItemIds),
  ) as {
    id: string;
    title: string;
    raw_summary: string | null;
    content: string | null;
    url: string | null;
    scan_meta: { entities?: string[] } | null;
  }[];
  const newItems = items.map((i) => ({
    id: i.id,
    title: i.title,
    summary: i.raw_summary,
    content: i.content,
    url: i.url,
    entities: i.scan_meta?.entities ?? [],
  }));

  return {
    threadId: chosen,
    title: thread.title,
    state: thread.state,
    topicId: thread.topic_id,
    categoryId: thread.category_id,
    categorySlug,
    topicName,
    threadEntities: thread.entities,
    facet,
    umbrellaTitle,
    deepEditionItemIds,
    newItems,
  };
}

/**
 * Phase D3 overflow fill: any `deep` edition_item this edition that is still blank
 * AND linked to a thread this edition gets a no-AI fallback body (the item's
 * raw_summary, else its title). Covers storylines past the per-edition update cap
 * and shared items no storyline claimed, so no deep card stays blank and the
 * generate requeue loop terminates. Returns the number filled; idempotent (a
 * second run finds nothing blank).
 */
export async function fillBlankThreadDeepItems(editionId: string): Promise<number> {
  const deepRows = unwrap(
    await db()
      .from("edition_items")
      .select("id, item_id, summary_text")
      .eq("edition_id", editionId)
      .eq("band", "deep"),
  ) as { id: string; item_id: string; summary_text: string | null }[];
  const blank = deepRows.filter((d) => !d.summary_text);
  if (blank.length === 0) return 0;

  const links = unwrap(
    await db().from("thread_items").select("item_id").eq("edition_id", editionId),
  ) as { item_id: string }[];
  const linked = new Set(links.map((l) => l.item_id));
  const targets = blank.filter((d) => linked.has(d.item_id));
  if (targets.length === 0) return 0;

  const items = unwrap(
    await db().from("items").select("id, title, raw_summary").in("id", targets.map((t) => t.item_id)),
  ) as { id: string; title: string; raw_summary: string | null }[];
  const byId = new Map(items.map((i) => [i.id, i]));

  let filled = 0;
  for (const t of targets) {
    const it = byId.get(t.item_id);
    const body = (it?.raw_summary?.trim() || it?.title?.trim() || "").trim();
    if (!body) continue;
    const { error } = await db().from("edition_items").update({ summary_text: body }).eq("id", t.id);
    if (error) throw new Error(`fillBlankThreadDeepItems: ${error.message}`);
    filled++;
  }
  return filled;
}

/**
 * Persist a thread update: body onto its deep edition_items, state+title+prediction
 * onto the thread, and — when there is a prediction — mirror it into a linked
 * calendar_event (so it flows into the agenda + the archive's projections). The
 * prediction event is refreshed each edition: the thread's prior prediction event
 * (meta.prediction = true) is deleted before the new one is inserted, so a thread
 * carries at most one current forecast.
 */
export async function applyThreadUpdate(
  deepEditionItemIds: string[],
  threadId: string,
  profileId: string,
  editionId: string,
  update: Pick<ThreadUpdate, "headline" | "lead" | "ripples" | "newState" | "prediction">,
): Promise<void> {
  // Flat text for the dashboard card + pre-Phase-1 readers; structured article
  // (lead + ripples) as jsonb for the krant's two-layer render.
  const summaryText = [update.lead, ...update.ripples.map((r) => `${r.subhead}\n${r.text}`)]
    .filter((s) => s.trim().length > 0)
    .join("\n\n")
    .trim();
  const article = { lead: update.lead, ripples: update.ripples };
  for (const id of deepEditionItemIds) {
    const { error } = await db()
      .from("edition_items")
      .update({ summary_text: summaryText, article })
      .eq("id", id);
    if (error) throw new Error(`applyThreadUpdate item: ${error.message}`);
  }
  const { error } = await db()
    .from("threads")
    .update({
      state: update.newState,
      title: update.headline,
      prediction: update.prediction,
      state_edition_id: editionId, // Phase D3 per-thread idempotency guard
    })
    .eq("id", threadId);
  if (error) throw new Error(`applyThreadUpdate thread: ${error.message}`);

  // Refresh the linked prediction event (idempotent: clear this thread's prior one first).
  const { error: delErr } = await db()
    .from("calendar_events")
    .delete()
    .eq("thread_id", threadId)
    .eq("meta->>prediction", "true");
  if (delErr) throw new Error(`applyThreadUpdate prediction-clear: ${delErr.message}`);

  if (update.prediction) {
    const p = update.prediction;
    const { error: insErr } = await db().from("calendar_events").insert({
      profile_id: profileId,
      thread_id: threadId,
      item_id: null,
      title: p.text,
      kind: "overig",
      date: p.target_date,
      certainty: p.confidence,
      source: null,
      meta: { prediction: true, source_basis: p.source_basis },
    });
    if (insErr) throw new Error(`applyThreadUpdate prediction-insert: ${insErr.message}`);
  }
}
