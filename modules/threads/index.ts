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
import type { DestepLens, Thread, ThreadStatus } from "../shared/types";

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
// Thread action planner — pure decision over today's edition items
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

/** A storyline to create this edition, with the items that seed it. */
export interface NewThreadPlan {
  seedTitle: string;
  topicId: string | null;
  categoryId: string | null;
  /** display-form entities of the members (normalized on store) */
  entities: string[];
  memberItemIds: string[];
  reason: "followed" | "big_topic";
}

export interface ThreadActions {
  /** attach an existing item to an existing thread */
  links: { itemId: string; threadId: string }[];
  /** storylines to open this edition */
  newThreads: NewThreadPlan[];
}

export interface ThreadPlanConfig {
  matchMinOverlap: number;
  bigTopicMinOverlap: number;
  bigTopicMinCluster: number;
}

/**
 * Decide, for today's edition items, what links into existing threads and what
 * opens a new one.
 *
 * - **Linking is universal:** any item whose entities overlap an active thread
 *   joins it, followed or not — that is how a storyline keeps absorbing news.
 * - **A NEW thread is born only for** (a) a big cross-source cluster (a major
 *   story), or (b) a *followed* item that is also **significant** (`deep` band)
 *   this edition. An ordinary or non-deep followed headline stays a plain item —
 *   that is what keeps threads to real storylines instead of one per headline.
 *
 * Idempotency: items already linked this edition are skipped, and matching runs
 * to a **fixed point** — because attaching an item grows a thread's entity set,
 * a straggler that only matches *after* that growth is pulled in within this
 * same run. So a re-run (which sees the persisted, grown threads) links nothing
 * further: the result is a pure, re-run-safe function of (items, threads, links).
 */
export function planThreadActions(
  candidates: ThreadCandidate[],
  threads: Pick<Thread, "id" | "entities" | "topic_id">[],
  alreadyLinked: Set<string>,
  followedTopicIds: Set<string>,
  followedCategoryIds: Set<string>,
  cfg: ThreadPlanConfig,
): ThreadActions {
  const fresh = candidates.filter((c) => !alreadyLinked.has(c.itemId));
  const candById = new Map(fresh.map((c) => [c.itemId, c]));

  // Working threads: existing ones (key "e:<id>") plus any we open ("n:<index>").
  // Entities are kept normalized + capped exactly as they will be persisted, so
  // the matching landscape here equals what a re-run would see on disk.
  type Work = { key: string; entities: string[]; topicId: string | null };
  const work: Work[] = threads.map((t) => ({
    key: `e:${t.id}`,
    entities: mergeEntities(t.entities, []),
    topicId: t.topic_id,
  }));
  const workByKey = new Map(work.map((w) => [w.key, w]));
  const newThreads: NewThreadPlan[] = [];
  const assign = new Map<string, string>(); // itemId -> work key

  const attach = (itemId: string, key: string) => {
    assign.set(itemId, key);
    const w = workByKey.get(key)!;
    w.entities = mergeEntities(w.entities, candById.get(itemId)?.entities ?? []);
  };
  const matchOpen = (c: ThreadCandidate): string | null =>
    matchThread(
      c.entities,
      c.topicId,
      work.map((w) => ({ id: w.key, entities: w.entities, topic_id: w.topicId })),
      cfg.matchMinOverlap,
    )?.threadId ?? null;
  const unassigned = () => fresh.filter((c) => !assign.has(c.itemId));

  const sweep = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of unassigned()) {
        const key = matchOpen(c);
        if (key) {
          attach(c.itemId, key);
          changed = true;
        }
      }
    }
  };

  const openThread = (seed: ThreadCandidate, reason: NewThreadPlan["reason"]): string => {
    const idx = newThreads.length;
    const key = `n:${idx}`;
    newThreads.push({
      seedTitle: seed.title,
      topicId: seed.topicId,
      categoryId: seed.categoryId,
      entities: [],
      memberItemIds: [],
      reason,
    });
    const w: Work = { key, entities: [], topicId: seed.topicId };
    work.push(w);
    workByKey.set(key, w);
    return key;
  };

  // 1. Link to existing threads (fixed point — attaching grows entities).
  sweep();

  // 2. Big topic: cross-source clusters among the still-unassigned items.
  const clusters = clusterByEntities(
    unassigned().map((c) => ({ id: c.itemId, entities: c.entities })),
    cfg.bigTopicMinOverlap,
    cfg.bigTopicMinCluster,
  );
  for (const cluster of clusters) {
    const members = cluster.map((id) => candById.get(id)!);
    const seed = members.reduce(
      (best, c) => ((c.importance ?? 0) > (best.importance ?? 0) ? c : best),
      members[0],
    );
    const key = openThread(seed, "big_topic");
    for (const id of cluster) attach(id, key);
  }

  // 3. Followed + significant (deep band): open a thread for each.
  for (const c of unassigned()) {
    if (!c.deep) continue;
    const followed =
      (c.topicId != null && followedTopicIds.has(c.topicId)) ||
      (c.categoryId != null && followedCategoryIds.has(c.categoryId));
    if (!followed) continue;
    attach(c.itemId, openThread(c, "followed"));
  }

  // 4. Final fixed point: pull stragglers into any thread we touched or opened.
  sweep();

  // Build the action plan from the assignments.
  const links: { itemId: string; threadId: string }[] = [];
  for (const [itemId, key] of assign) {
    if (key.startsWith("e:")) links.push({ itemId, threadId: key.slice(2) });
    else newThreads[Number(key.slice(2))].memberItemIds.push(itemId);
  }
  for (const nt of newThreads) {
    nt.entities = nt.memberItemIds.flatMap((id) => candById.get(id)?.entities ?? []);
  }
  return { links, newThreads };
}

// ============================================================
// Mega-threads — anchor-entity detection + absorption (Phase 5c-1)
// ============================================================

/** Per normalized entity: the distinct days it appeared + a display form. */
export type EntityDays = Map<string, { days: Set<string>; display: string }>;

/**
 * Anchor entities = those that recur across at least `minDays` distinct days in
 * the window. Recurrence (not same-day breadth) is what marks a story that
 * "keeps coming back" — the seed of a mega-thread. Returns the normalized
 * entity plus a display form for the thread title.
 */
export function detectAnchors(
  entityDays: EntityDays,
  minDays: number,
): { entity: string; display: string }[] {
  const out: { entity: string; display: string }[] = [];
  for (const [norm, info] of entityDays) {
    if (info.days.size >= minDays) out.push({ entity: norm, display: info.display });
  }
  return out;
}

/** A mega-thread to maintain this run, with the children it should absorb. */
export interface MegaAssignment {
  entity: string;
  display: string;
  childIds: string[];
}

/**
 * Assign normal threads to mega-threads, one parent each. A thread whose
 * entities include several anchors goes to its **best** anchor — the biggest
 * story (most candidate threads), ties broken alphabetically for determinism —
 * so children never split across megas and common entities don't steal them.
 * Only anchors that end up with ≥ `minChildren` children survive (the rest
 * aren't real mega-stories). Mega-threads themselves are never absorbed.
 */
export function assignMegaThreads(
  anchors: { entity: string; display: string }[],
  threads: { id: string; entities: string[]; anchor_entity: string | null }[],
  minChildren: number,
): MegaAssignment[] {
  const normal = threads.filter((t) => !t.anchor_entity);
  const candidates = new Map<string, string[]>(anchors.map((a) => [a.entity, []]));
  const matchesByThread = new Map<string, string[]>();
  for (const t of normal) {
    const ents = new Set(t.entities.map(normalizeEntity));
    const matched = anchors.filter((a) => ents.has(a.entity)).map((a) => a.entity);
    if (matched.length === 0) continue;
    matchesByThread.set(t.id, matched);
    for (const e of matched) candidates.get(e)!.push(t.id);
  }
  const size = (e: string) => candidates.get(e)?.length ?? 0;

  const assigned = new Map<string, string[]>();
  for (const [threadId, matched] of matchesByThread) {
    const best = [...matched].sort((a, b) => size(b) - size(a) || a.localeCompare(b))[0];
    const arr = assigned.get(best) ?? [];
    arr.push(threadId);
    assigned.set(best, arr);
  }

  const display = new Map(anchors.map((a) => [a.entity, a.display]));
  return [...assigned.entries()]
    .filter(([, ids]) => ids.length >= minChildren)
    .map(([entity, childIds]) => ({ entity, display: display.get(entity) as string, childIds }));
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
  lastEditionId: string;
  lastSeenAt: string;
  /** set for a mega-thread (the normalized anchor entity); omit for a normal thread */
  anchorEntity?: string;
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
        last_edition_id: input.lastEditionId,
        last_seen_at: input.lastSeenAt,
      })
      .select("id")
      .single(),
  ) as { id: string };
  return row.id;
}

/**
 * Per-entity distinct-day map over the profile's recent edition items — the
 * input to detectAnchors. Entities live on items.scan_meta.entities (display
 * form); the edition date supplies the "day".
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
    for (const raw of r.items?.scan_meta?.entities ?? []) {
      const norm = normalizeEntity(raw);
      if (!norm) continue;
      const e = map.get(norm) ?? { days: new Set<string>(), display: raw };
      e.days.add(date);
      map.set(norm, e);
    }
  }
  return map;
}

/** Find the profile's mega-thread for an anchor entity, creating it if absent. */
export async function findOrCreateMegaThread(
  profileId: string,
  anchorNorm: string,
  displayTitle: string,
  editionId: string,
  now: string,
): Promise<string> {
  const existing = (await db()
    .from("threads")
    .select("id")
    .eq("profile_id", profileId)
    .eq("anchor_entity", anchorNorm)
    .maybeSingle()).data as { id: string } | null;
  if (existing) {
    await db()
      .from("threads")
      .update({ status: "active", last_edition_id: editionId, last_seen_at: now })
      .eq("id", existing.id);
    return existing.id;
  }
  return insertThread({
    profileId,
    topicId: null,
    categoryId: null,
    title: displayTitle,
    entities: [anchorNorm],
    status: "active",
    lastEditionId: editionId,
    lastSeenAt: now,
    anchorEntity: anchorNorm,
  });
}

/** Re-parent child threads under a mega-thread (absorb them). */
export async function setThreadParent(childIds: string[], parentId: string): Promise<void> {
  if (childIds.length === 0) return;
  const { error } = await db()
    .from("threads")
    .update({ parent_thread_id: parentId })
    .in("id", childIds);
  if (error) throw new Error(`setThreadParent: ${error.message}`);
}

/** Detach threads from their mega-parent (when they're no longer assigned to one). */
export async function clearThreadParents(childIds: string[]): Promise<void> {
  if (childIds.length === 0) return;
  const { error } = await db()
    .from("threads")
    .update({ parent_thread_id: null })
    .in("id", childIds);
  if (error) throw new Error(`clearThreadParents: ${error.message}`);
}

/** Delete mega-threads (anchor_entity set) that ended up with no children. Returns the count. */
export async function deleteChildlessMegaThreads(profileId: string): Promise<number> {
  const megas = unwrap(
    await db().from("threads").select("id").eq("profile_id", profileId).not("anchor_entity", "is", null),
  ) as { id: string }[];
  let deleted = 0;
  for (const m of megas) {
    const kids = unwrap(
      await db().from("threads").select("id").eq("parent_thread_id", m.id).limit(1),
    ) as { id: string }[];
    if (kids.length === 0) {
      await db().from("threads").delete().eq("id", m.id);
      deleted++;
    }
  }
  return deleted;
}

/** Upsert thread↔item links; unique(thread_id,item_id) + ignore makes it re-run safe. */
export async function linkThreadItems(
  links: { threadId: string; itemId: string; editionId: string }[],
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
  /** this edition's deep edition_item ids of this thread — where the update body lands */
  deepEditionItemIds: string[];
  /** today's items linked to this thread — all genuinely new (unique(thread_id,item_id)) */
  newItems: { id: string; title: string; summary: string | null; url: string | null; entities: string[] }[];
}

/**
 * The next thread still needing an update this edition: one with a `deep`
 * edition_item linked this edition whose summary_text is empty. Null when every
 * such thread is done — that empty-summary gate is the per-edition idempotency
 * guard (state advances ≤ once). One job per call fits the requeue model.
 */
export async function nextThreadUpdateJob(editionId: string): Promise<ThreadUpdateJob | null> {
  const deepRows = unwrap(
    await db()
      .from("edition_items")
      .select("id, item_id, summary_text")
      .eq("edition_id", editionId)
      .eq("band", "deep"),
  ) as { id: string; item_id: string; summary_text: string | null }[];
  if (deepRows.length === 0) return null;

  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id").eq("edition_id", editionId),
  ) as { thread_id: string; item_id: string }[];
  const threadByItem = new Map(links.map((l) => [l.item_id, l.thread_id]));

  // group this edition's deep items by thread; pending = any deep item still blank
  const deepByThread = new Map<string, { ids: string[]; pending: boolean }>();
  for (const d of deepRows) {
    const threadId = threadByItem.get(d.item_id);
    if (!threadId) continue;
    const g = deepByThread.get(threadId) ?? { ids: [], pending: false };
    g.ids.push(d.id);
    if (!d.summary_text) g.pending = true;
    deepByThread.set(threadId, g);
  }

  let chosen: string | null = null;
  for (const [threadId, g] of deepByThread) {
    if (g.pending) {
      chosen = threadId;
      break;
    }
  }
  if (!chosen) return null;
  const deepEditionItemIds = deepByThread.get(chosen)!.ids;

  const thread = unwrap(
    await db()
      .from("threads")
      .select("id, title, state, topic_id, category_id, entities")
      .eq("id", chosen)
      .single(),
  ) as {
    title: string;
    state: string | null;
    topic_id: string | null;
    category_id: string | null;
    entities: string[];
  };

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

  const todayItemIds = links.filter((l) => l.thread_id === chosen).map((l) => l.item_id);
  const items = todayItemIds.length
    ? (unwrap(
        await db().from("items").select("id, title, raw_summary, url, scan_meta").in("id", todayItemIds),
      ) as {
        id: string;
        title: string;
        raw_summary: string | null;
        url: string | null;
        scan_meta: { entities?: string[] } | null;
      }[])
    : [];
  const newItems = items.map((i) => ({
    id: i.id,
    title: i.title,
    summary: i.raw_summary,
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
    deepEditionItemIds,
    newItems,
  };
}

/** Persist a thread update: body onto its deep edition_items, state+title onto the thread. */
export async function applyThreadUpdate(
  deepEditionItemIds: string[],
  threadId: string,
  update: { headline: string; body: string; newState: string },
): Promise<void> {
  for (const id of deepEditionItemIds) {
    const { error } = await db()
      .from("edition_items")
      .update({ summary_text: update.body })
      .eq("id", id);
    if (error) throw new Error(`applyThreadUpdate item: ${error.message}`);
  }
  const { error } = await db()
    .from("threads")
    .update({ state: update.newState, title: update.headline })
    .eq("id", threadId);
  if (error) throw new Error(`applyThreadUpdate thread: ${error.message}`);
}
