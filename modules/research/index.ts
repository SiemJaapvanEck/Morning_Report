// Research extraction (Research Tracking PRD, Phase 2 — extraction core).
//
// Turns a pasted/written research note into anchor entities + a topic label +
// a best-guess category, purely and testably. Runs ONCE on submit (not in the
// daily pipeline): one askAI scan-tier call, logged to usage_log like every
// other AI call — see docs/prd/research-tracking.md §4 Phase 2. Follows the
// modules/tavily defensive pattern: any failure (missing key, bad JSON,
// network) degrades to an empty extraction so a research note can always be
// saved even when extraction can't run.

import { askAI } from "../shared/ai";
import { normalizeEntity } from "../threads";
import type { ResearchExtraction } from "../shared/types";

/** Max anchor entities kept per research note (locked in the PRD). */
export const MAX_ENTITIES = 8;

/**
 * Fixed category catalog for the extraction prompt/parser. Mirrors the seeded
 * `categories` table (supabase/migrations/0002_seed.sql, 0005_voorkeuren.sql).
 * Kept as a static list — not a DB read — so buildExtractionPrompt/parseExtraction
 * stay pure; if the catalog changes, update this list alongside its migration.
 */
export const CATEGORY_SLUGS = [
  "tech",
  "wereld",
  "financieel",
  "games",
  "wetenschap",
  "frontier",
  "lokaal",
  "goed-nieuws",
] as const;

/** An empty extraction — the safe fallback everywhere (modules/tavily pattern). */
export function emptyExtraction(): ResearchExtraction {
  return { entities: [], topicLabel: "", categorySlug: null };
}

/**
 * Pure: build the Dutch extraction prompt for one research note. Asks for
 * strict JSON so parseExtraction can read the response back deterministically.
 */
export function buildExtractionPrompt(title: string, body: string): string {
  return (
    `Titel: ${title.trim()}\n\n` +
    `Onderzoekstekst:\n${body.trim()}\n\n` +
    "Analyseer dit onderzoek en geef ALLEEN geldige JSON terug (geen markdown, geen uitleg) " +
    "met exact deze velden:\n" +
    `- "entities": lijst van maximaal ${MAX_ENTITIES} kernbegrippen — organisaties, personen, ` +
    "producten, plaatsen of gebeurtenissen die dit onderzoek verankeren (dezelfde soort " +
    "entiteiten als in nieuwsartikelen).\n" +
    '- "topicLabel": een korte Nederlandse naam (max 6 woorden) voor de verhaallijn die dit ' +
    "onderzoek wordt.\n" +
    `- "categorySlug": de best passende categorie-slug uit deze lijst: ${CATEGORY_SLUGS.join(", ")} ` +
    "— of null als geen enkele goed past.\n\n" +
    'Voorbeeld: {"entities": ["Anthropic", "Claude"], "topicLabel": "AI-modelontwikkeling", "categorySlug": "tech"}'
  );
}

/**
 * Pure: parse the raw askAI response into a ResearchExtraction. Defensive —
 * malformed/non-JSON text, a missing or wrong-typed field, or an unknown
 * category slug all degrade gracefully instead of throwing, since
 * extractResearch relies on this to never blow up the submit path. Entities
 * are normalized via modules/threads' normalizeEntity (same vocabulary the
 * pipeline's thread matching uses) and deduped/capped at MAX_ENTITIES.
 */
export function parseExtraction(raw: string): ResearchExtraction {
  if (!raw || !raw.trim()) return emptyExtraction();

  // Strip a ```json ... ``` fence if the model wrapped its output in one.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return emptyExtraction();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyExtraction();
  const obj = parsed as Record<string, unknown>;

  const rawEntities = Array.isArray(obj.entities) ? obj.entities : [];
  const entities: string[] = [];
  const seen = new Set<string>();
  for (const e of rawEntities) {
    if (typeof e !== "string") continue;
    const normalized = normalizeEntity(e);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    entities.push(normalized);
    if (entities.length >= MAX_ENTITIES) break;
  }

  const topicLabel = typeof obj.topicLabel === "string" ? obj.topicLabel.trim() : "";

  const categorySlugRaw = typeof obj.categorySlug === "string" ? obj.categorySlug.trim() : "";
  const categorySlug = (CATEGORY_SLUGS as readonly string[]).includes(categorySlugRaw)
    ? categorySlugRaw
    : null;

  return { entities, topicLabel, categorySlug };
}

/** Token budget for the extraction call — small, structured JSON output. */
const EXTRACTION_MAX_TOKENS = 400;

/**
 * Run the on-submit extraction: one askAI scan-tier call, logged to usage_log
 * (editionId: null — this runs outside the daily edition/pipeline budget, per
 * the PRD's locked decision). Never throws: any failure (missing key, network,
 * bad response, unparsable JSON) degrades to an empty extraction, the same
 * defensive contract as modules/tavily's searchTavily — a research note can
 * always be saved even when extraction can't run.
 */
export async function extractResearch(title: string, body: string): Promise<ResearchExtraction> {
  try {
    const result = await askAI({
      tier: "scan",
      editionId: null,
      maxTokens: EXTRACTION_MAX_TOKENS,
      system:
        "Je extraheert kernbegrippen uit onderzoeksnotities voor een persoonlijk ochtendrapport. " +
        "Antwoord ALLEEN met geldige JSON, geen uitleg, geen markdown-codeblok.",
      prompt: buildExtractionPrompt(title, body),
    });
    return parseExtraction(result.text);
  } catch (err) {
    console.warn(`[research] extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    return emptyExtraction();
  }
}
