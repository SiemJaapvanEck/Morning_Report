// Tavily web-search grounding (Phase 5).
//
// RSS feeds give ~350-char summaries, so deep articles correctly refuse to
// invent consequences they can't ground and ripples stay near-zero. This module
// fetches real article text for a deep topic and shapes it into a grounding
// block that the existing deep-research synthesis call uses as extra source.
//
// Retrieval is a plain fetch — NOT an LLM call, so it does NOT go through
// askAI(). It is purely additive: any failure (no key, network, bad response)
// degrades to empty grounding so the pipeline keeps running unchanged.

import { config } from "../shared/config";

/** One web result kept as grounding: a titled, attributed snippet of real text. */
export interface GroundingSnippet {
  title: string;
  url: string;
  /** the extracted article text (bounded), the actual source for the model */
  content: string;
}

/** The grounding handed to a synthesis call: the query used + its snippets. */
export interface Grounding {
  query: string;
  snippets: GroundingSnippet[];
}

/** Whether grounding is both switched on and has a key to use. */
export function tavilyEnabled(): boolean {
  return config.tavily.enabled && config.tavily.apiKey.length > 0;
}

/** An empty grounding result (the safe fallback everywhere). */
export function emptyGrounding(query = ""): Grounding {
  return { query, snippets: [] };
}

/**
 * Pure: build a focused search query from a topic title and its known entities.
 * Entities sharpen the query (disambiguation), but we cap how many we append so
 * the query stays a query and not a keyword soup. Dedupes entities already named
 * in the title (case-insensitive) to avoid "Tesla Tesla Q2".
 */
export function buildQuery(title: string, entities: string[] = [], maxEntities = 3): string {
  const base = title.trim();
  const lowerBase = base.toLowerCase();
  const extra = entities
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && !lowerBase.includes(e.toLowerCase()))
    // de-dupe entities among themselves, preserving order
    .filter((e, i, arr) => arr.findIndex((o) => o.toLowerCase() === e.toLowerCase()) === i)
    .slice(0, maxEntities);
  return [base, ...extra].join(" ").trim();
}

/**
 * Pure: shape Tavily's raw `results` into bounded grounding snippets. Drops
 * results without usable content or url, trims each snippet to maxSnippetChars
 * (so token cost stays bounded), and keeps at most maxResults.
 */
export function shapeGrounding(
  query: string,
  rawResults: { title?: string; url?: string; content?: string }[] | null | undefined,
  maxResults = config.tavily.maxResults,
  maxSnippetChars = config.tavily.maxSnippetChars,
): Grounding {
  const snippets: GroundingSnippet[] = (rawResults ?? [])
    .map((r) => ({
      title: (r?.title ?? "").trim(),
      url: (r?.url ?? "").trim(),
      content: (r?.content ?? "").trim().slice(0, maxSnippetChars),
    }))
    .filter((s) => s.url.length > 0 && s.content.length > 0)
    .slice(0, maxResults);
  return { query, snippets };
}

/**
 * Pure: render grounding into a Dutch prompt block with numbered, attributed
 * citations the synthesis prompt can reference. Empty grounding ⇒ "" so callers
 * can concatenate unconditionally. The model is told (in generate's system
 * prompt) it MAY use these as source, under the same no-fabrication rule.
 */
export function formatGroundingBlock(grounding: Grounding): string {
  if (grounding.snippets.length === 0) return "";
  const lines = grounding.snippets
    .map((s, i) => `[${i + 1}] ${s.title || s.url}\n${s.content}\n(bron: ${s.url})`)
    .join("\n\n");
  return `Aanvullende webbronnen (web-search, gebruik als extra onderbouwing):\n${lines}`;
}

/**
 * Fetch web grounding for one query via Tavily's search API. Plain fetch (not
 * askAI). Never throws: on a missing key, network error, or non-OK response it
 * returns empty grounding and logs a warning — grounding is additive, so a
 * failure must not break generation.
 */
export async function searchTavily(
  query: string,
  opts: { maxResults?: number; searchDepth?: "basic" | "advanced" } = {},
): Promise<Grounding> {
  if (!tavilyEnabled() || !query.trim()) return emptyGrounding(query);

  const maxResults = opts.maxResults ?? config.tavily.maxResults;
  try {
    const res = await fetch(config.tavily.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.tavily.apiKey}`,
      },
      body: JSON.stringify({
        query: query.trim(),
        max_results: maxResults,
        search_depth: opts.searchDepth ?? config.tavily.searchDepth,
      }),
    });
    if (!res.ok) {
      console.warn(`[tavily] search failed: ${res.status} ${res.statusText}`);
      return emptyGrounding(query);
    }
    const json = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return shapeGrounding(query, json.results, maxResults);
  } catch (err) {
    console.warn(`[tavily] search error: ${err instanceof Error ? err.message : String(err)}`);
    return emptyGrounding(query);
  }
}
