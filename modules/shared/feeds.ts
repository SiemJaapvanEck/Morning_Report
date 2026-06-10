// RSS-feedparser + reclamefilter (heuristische laag).
//
// De heuristiek vangt feed-tags en bekende patronen; de AI-classificatie in de
// scan-stap (modules/rank) vangt de rest. Officiële fabrikant-persberichten
// zijn géén reclame (zie ontwerp §5) — die filteren we hier dus niet.

import Parser from "rss-parser";
import { createHash } from "node:crypto";

export interface FeedItem {
  guid: string;
  url: string | null;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  isAd: boolean;
}

const AD_PATTERNS = [
  /\bsponsored\b/i,
  /\badvertorial\b/i,
  /\bpartner\s?content\b/i,
  /\bpaid\s?post\b/i,
  /\bgesponsord\b/i,
  /\badvertentie\b/i,
  /\bdeal(s)?\s?:\s/i,
  /\bbeste?\s?deals\b/i,
  /\bkorting(scode)?\b/i,
  /\bblack friday\b/i,
  /\baanbieding(en)?\b/i,
];

/** Pure functie: detecteert gesponsorde/advertorial content op tekstniveau. */
export function looksLikeAd(title: string, summary?: string | null, categories?: string[]): boolean {
  const haystacks = [title, summary ?? "", ...(categories ?? [])];
  return haystacks.some((text) => AD_PATTERNS.some((pattern) => pattern.test(text)));
}

/** Stabiele hash van de kerninhoud, voor cross-source dedupe. */
export function contentHash(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

const parser = new Parser({ timeout: 8000 });

/** Haalt één feed op en normaliseert de items. Gooit bij netwerkfouten. */
export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? []).map((item) => {
    const title = item.title?.trim() ?? "(zonder titel)";
    const summary = item.contentSnippet?.trim() || item.summary?.trim() || null;
    return {
      guid: item.guid ?? item.link ?? title,
      url: item.link ?? null,
      title,
      summary,
      publishedAt: item.isoDate ?? null,
      isAd: looksLikeAd(title, summary, item.categories),
    };
  });
}
