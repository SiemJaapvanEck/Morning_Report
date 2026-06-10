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
