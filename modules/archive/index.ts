// Archief: dedupe en editie-historie.
//
// v1 (verticale plak): cross-source dedupe op content_hash.
// Fase 5 bouwt hierop verder: secties doorzoeken, cross-refs, export.

import { db, unwrap } from "../shared/db";
import type { Item } from "../shared/types";

/**
 * Filtert items die de afgelopen `daysBack` dagen al in een editie van dit
 * profiel zaten ("geen oud nieuws"), plus duplicaten binnen de batch zelf.
 */
export async function dedupeForEdition(
  profileId: string,
  candidates: Item[],
  daysBack = 7,
): Promise<Item[]> {
  if (candidates.length === 0) return [];

  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  // hashes van items die recent al gerapporteerd zijn aan dit profiel
  const reported = unwrap(
    await db()
      .from("edition_items")
      .select("item_id, items(content_hash), editions!inner(profile_id, created_at)")
      .eq("editions.profile_id", profileId)
      .gte("editions.created_at", cutoff),
  ) as unknown as { items: { content_hash: string | null } | null }[];

  const seenHashes = new Set(
    reported.map((row) => row.items?.content_hash).filter((hash): hash is string => Boolean(hash)),
  );

  const result: Item[] = [];
  for (const item of candidates) {
    const hash = item.content_hash;
    if (hash && seenHashes.has(hash)) continue; // al eerder gerapporteerd of dubbel in batch
    if (hash) seenHashes.add(hash);
    result.push(item);
  }
  return result;
}

/**
 * Reader perspective for thread-aware generation: titles of items the reader
 * rated highly (≥4) within this thread's topic/category, newest first. One
 * cheap query pair, no AI. feedback_events.target_id is polymorphic (no FK to
 * items), so we resolve it in two steps. Empty when the thread has no
 * topic/category or the reader has rated nothing there.
 */
export async function archivePrimer(
  profileId: string,
  topicId: string | null,
  categoryId: string | null,
  limit = 5,
): Promise<string[]> {
  if (!topicId && !categoryId) return [];

  const rated = unwrap(
    await db()
      .from("feedback_events")
      .select("target_id, created_at")
      .eq("profile_id", profileId)
      .eq("target_type", "item")
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(50),
  ) as { target_id: string; created_at: string }[];
  if (rated.length === 0) return [];

  const items = unwrap(
    await db()
      .from("items")
      .select("id, title, topic_id, category_id")
      .in("id", rated.map((r) => r.target_id)),
  ) as { id: string; title: string; topic_id: string | null; category_id: string | null }[];
  const byId = new Map(items.map((i) => [i.id, i]));

  const titles: string[] = [];
  for (const r of rated) {
    // preserve recency order from the feedback query
    const item = byId.get(r.target_id);
    if (!item) continue;
    if ((topicId && item.topic_id === topicId) || (categoryId && item.category_id === categoryId)) {
      titles.push(item.title);
      if (titles.length >= limit) break;
    }
  }
  return titles;
}
