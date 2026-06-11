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
  imageUrl: string | null;
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

/** Velden zoals rss-parser ze aanlevert; alleen wat de afbeelding-extractie nodig heeft. */
export interface RawFeedItemMedia {
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } }[];
  mediaThumbnail?: { $?: { url?: string } }[];
  content?: string;
  "content:encoded"?: string;
}

/**
 * Pure functie: beste artikelafbeelding uit een feed-item. Volgorde:
 * media:content → media:thumbnail → enclosure (alleen image/*) → eerste
 * <img> in de HTML-inhoud. Geeft null als er niets bruikbaars is.
 */
export function extractImage(item: RawFeedItemMedia): string | null {
  for (const media of item.mediaContent ?? []) {
    const attrs = media.$;
    if (!attrs?.url) continue;
    if (attrs.medium && attrs.medium !== "image") continue;
    if (attrs.type && !attrs.type.startsWith("image/")) continue;
    return attrs.url;
  }

  const thumb = (item.mediaThumbnail ?? []).find((entry) => entry.$?.url);
  if (thumb?.$?.url) return thumb.$.url;

  if (item.enclosure?.url && (item.enclosure.type?.startsWith("image/") ?? false)) {
    return item.enclosure.url;
  }

  const html = item["content:encoded"] || item.content || "";
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (img && /^https?:\/\//.test(img[1])) return img[1];

  return null;
}

const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "content:encoded"],
    ],
  },
});

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
      imageUrl: extractImage(item as RawFeedItemMedia),
    };
  });
}
