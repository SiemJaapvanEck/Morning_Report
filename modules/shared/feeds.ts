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
  /** Full article body as plain text (from content:encoded), or null for snippet-only feeds. */
  content: string | null;
  /** Playable media (podcast audio / YouTube video), or null for plain articles. */
  media: { url: string; durationSec: number | null } | null;
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

/**
 * Pure functie: strip feed-HTML naar leesbare platte tekst, zodat we het volledige
 * artikel (content:encoded) als grondstof aan de deep-research-call kunnen geven.
 * Blok-einden worden newlines; scripts/styles en overige tags verdwijnen; de meest
 * voorkomende HTML-entiteiten worden gedecodeerd. Leeg/geen body → null.
 */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ") // scripts/styles eruit
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n") // blok-einden → newline
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ") // resterende tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&hellip;|&#8230;/g, "…")
    .replace(/&#?[a-z0-9]+;/gi, " ") // overige entiteiten → spatie
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 0 ? text : null;
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

/** Velden die de media-extractie (catch-up) nodig heeft. */
export interface RawFeedMedia {
  enclosure?: { url?: string; type?: string };
  itunesDuration?: string;
  /** item-link; bij YouTube-feeds is dit de watch-URL */
  link?: string;
}

/**
 * Pure functie: een itunes:duration ("3600", "62:03", "1:02:03") naar hele
 * seconden. Geeft null bij een lege of onleesbare waarde.
 */
export function parseDuration(raw?: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed); // al in seconden
  const parts = trimmed.split(":").map(Number);
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/**
 * Pure functie: de afspeelbare media-URL + duur uit een feed-item, voor de
 * catch-up-aanbeveling. Podcasts hebben een audio/video-enclosure (+ vaak
 * itunes:duration); YouTube-kanaalfeeds zetten de watch-URL in de item-link.
 * Geeft null als er niets afspeelbaars is (gewoon artikel).
 */
export function extractMedia(item: RawFeedMedia): { url: string; durationSec: number | null } | null {
  const enc = item.enclosure;
  if (enc?.url && (enc.type?.startsWith("audio/") || enc.type?.startsWith("video/"))) {
    return { url: enc.url, durationSec: parseDuration(item.itunesDuration) };
  }
  if (item.link && /(?:youtube\.com\/watch|youtu\.be\/)/i.test(item.link)) {
    return { url: item.link, durationSec: parseDuration(item.itunesDuration) };
  }
  return null;
}

const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "content:encoded"],
      ["itunes:duration", "itunesDuration"],
    ],
  },
});

/** Haalt één feed op en normaliseert de items. Gooit bij netwerkfouten. */
export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? []).map((item) => {
    const title = item.title?.trim() ?? "(zonder titel)";
    const summary = item.contentSnippet?.trim() || item.summary?.trim() || null;
    const raw = item as RawFeedItemMedia;
    const content = htmlToText(raw["content:encoded"] || raw.content);
    return {
      guid: item.guid ?? item.link ?? title,
      url: item.link ?? null,
      title,
      summary,
      publishedAt: item.isoDate ?? null,
      isAd: looksLikeAd(title, summary, item.categories),
      imageUrl: extractImage(item as RawFeedItemMedia),
      content,
      media: extractMedia(item as RawFeedMedia),
    };
  });
}
