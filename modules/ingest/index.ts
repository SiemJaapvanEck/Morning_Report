// Ingestie: feeds binnenhalen, items normaliseren, reclame en duplicaten
// eruit, en wegschrijven naar de items-tabel.
//
// Query-modus (vrije onderwerpen → web-search) komt in fase 3; de structuur
// ligt er al (sources.kind = 'query').

import { db, unwrap } from "../shared/db";
import { fetchFeed, contentHash } from "../shared/feeds";
import type { MediaMeta, Source } from "../shared/types";

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

  // Media-bronnen (podcast/video) leveren uitlegcontent die evergreen is: die
  // slaan de "geen oud nieuws"-grens bewust over zodat een oudere uitlegvideo
  // over het onderwerp van vandaag alsnog kan worden aanbevolen. De expliciete
  // check valt veilig terug op artikel-gedrag als de medium-kolom (nog) ontbreekt.
  const isMedia = source.medium === "podcast" || source.medium === "video";
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const fresh = isMedia
    ? feedItems
    : feedItems.filter(
        (item) => !item.publishedAt || new Date(item.publishedAt).getTime() > cutoff,
      );

  // is een topic aan deze bron gekoppeld, dan krijgen de items dat topic
  // direct mee (de scan-stap respecteert dit); anders de normale zoekweg
  const pinned = await db()
    .from("topics")
    .select("id")
    .eq("source_id", source.id)
    .limit(1)
    .maybeSingle();
  const pinnedTopicId: string | null = pinned.data?.id ?? null;

  const rows = fresh.map((item) => {
    // playable media lands in scan_meta.media; the scan-stap merges its regio in
    // (modules/rank), so it is not clobbered. type comes from the source medium.
    const media: MediaMeta | null =
      isMedia && item.media
        ? { type: source.medium as "podcast" | "video", url: item.media.url, durationSec: item.media.durationSec }
        : null;
    return {
      source_id: source.id,
      category_id: source.category_id,
      topic_id: pinnedTopicId,
      guid: item.guid,
      url: item.url,
      title: item.title,
      raw_summary: item.summary,
      published_at: item.publishedAt,
      content_hash: contentHash(item.title),
      is_ad: item.isAd,
      image_url: item.imageUrl,
      scan_meta: media ? { media } : null,
    };
  });

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
