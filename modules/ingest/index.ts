// Ingestie: feeds binnenhalen, items normaliseren, reclame en duplicaten
// eruit, en wegschrijven naar de items-tabel.
//
// Query-modus (vrije onderwerpen → web-search) komt in fase 3; de structuur
// ligt er al (sources.kind = 'query').

import { db, unwrap } from "../shared/db";
import { fetchFeed, contentHash } from "../shared/feeds";
import type { Source } from "../shared/types";

export interface IngestResult {
  sourceId: string;
  sourceName: string;
  nieuw: number;
  overgeslagen: number;
  fout: string | null;
}

/** Actieve RSS-bronnen ophalen. */
export async function activeSources(): Promise<Source[]> {
  return unwrap(
    await db().from("sources").select("*").eq("active", true).eq("kind", "rss"),
  );
}

/**
 * Eén bron binnenhalen. Idempotent: bestaande (source_id, guid)-combinaties
 * worden genegeerd, dus een herhaalde run schrijft niets dubbel.
 */
export async function ingestSource(source: Source): Promise<IngestResult> {
  const result: IngestResult = {
    sourceId: source.id,
    sourceName: source.name,
    nieuw: 0,
    overgeslagen: 0,
    fout: null,
  };

  let feedItems;
  try {
    feedItems = await fetchFeed(source.url!);
  } catch (err) {
    result.fout = err instanceof Error ? err.message : String(err);
    await db()
      .from("sources")
      .update({ last_error: result.fout, last_fetched_at: new Date().toISOString() })
      .eq("id", source.id);
    return result;
  }

  // Recente items eerst; oudere dan 48u zijn geen "ochtendnieuws" meer
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const fresh = feedItems.filter(
    (item) => !item.publishedAt || new Date(item.publishedAt).getTime() > cutoff,
  );

  const rows = fresh.map((item) => ({
    source_id: source.id,
    category_id: source.category_id,
    guid: item.guid,
    url: item.url,
    title: item.title,
    raw_summary: item.summary,
    published_at: item.publishedAt,
    content_hash: contentHash(item.title),
    is_ad: item.isAd,
    image_url: item.imageUrl,
  }));

  if (rows.length > 0) {
    // upsert met ignoreDuplicates: alleen echt nieuwe items komen erin
    const { error, count } = await db()
      .from("items")
      .upsert(rows, { onConflict: "source_id,guid", ignoreDuplicates: true, count: "exact" });
    if (error) throw new Error(`Ingest ${source.name}: ${error.message}`);
    result.nieuw = count ?? 0;
    result.overgeslagen = rows.length - result.nieuw;
  }

  await db()
    .from("sources")
    .update({ last_error: null, last_fetched_at: new Date().toISOString() })
    .eq("id", source.id);

  return result;
}
