// Research extraction + seed & track (Research Tracking PRD, Phases 2-3).
//
// Turns a pasted/written research note into anchor entities + a topic label +
// a best-guess category, purely and testably. Runs ONCE on submit (not in the
// daily pipeline): one askAI scan-tier call, logged to usage_log like every
// other AI call — see docs/prd/research-tracking.md §4 Phase 2. Follows the
// modules/tavily defensive pattern: any failure (missing key, bad JSON,
// network) degrades to an empty extraction so a research note can always be
// saved even when extraction can't run.
//
// Phase 3 (below, DB helpers) wires an extracted note into the EXISTING
// threads engine — a research note seeds a normal followed thread via
// modules/threads' insertThread, with no parallel matcher and no new column
// on `threads` (a research thread is detected purely via
// `user_research.thread_id`, see isResearchOriginThread).

import { askAI } from "../shared/ai";
import { db, unwrap } from "../shared/db";
import { insertThread, normalizeEntity } from "../threads";
import type { ResearchExtraction, UserResearch } from "../shared/types";

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

// ============================================================
// DB helpers (Supabase) — Research Tracking PRD, Phase 3 (seed & track).
// Only app/api/research/route.ts calls these. Thread creation/following
// reuses modules/threads' insertThread wholesale (locked decision: no
// parallel matcher) — this module only wires a research note into it.
// ============================================================

/**
 * Best-guess category_id for a research note, resolved from its extracted
 * slug. A miss (unknown slug, or extraction found none) is expected and not
 * an error — unlike `unwrap`, this tolerates a null row.
 */
async function resolveCategoryId(categorySlug: string | null): Promise<string | null> {
  if (!categorySlug) return null;
  const { data, error } = await db().from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (error) throw new Error(`resolveCategoryId: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Seed the followed storyline for a research note: open a thread anchored on
 * the primary extracted entity (the first — extraction/scan order = salience,
 * same convention as modules/threads' primaryEntity), mark it followed via
 * follow_marks, and link it back onto the research note (thread_id + status
 * 'gevolgd'). Synchronous with create (locked decision) — no pipeline run
 * needed for the storyline to exist. entities/categoryId are already resolved
 * by the caller (extractResearch + resolveCategoryId).
 */
export async function seedResearchThread(input: {
  profileId: string;
  researchId: string;
  /** thread title — the research note's own title (locked decision, not the AI topicLabel) */
  title: string;
  entities: string[];
  categoryId: string | null;
}): Promise<string> {
  const anchorEntity = input.entities[0]; // first extracted entity = salience order (parseExtraction)
  const threadId = await insertThread({
    profileId: input.profileId,
    topicId: null,
    categoryId: input.categoryId,
    title: input.title,
    entities: input.entities,
    status: "active",
    lastEditionId: null, // seeded out-of-band, before any edition touches it
    lastSeenAt: new Date().toISOString(),
    anchorEntity,
  });

  const { error: followError } = await db()
    .from("follow_marks")
    .upsert(
      { profile_id: input.profileId, target_type: "thread", target_id: threadId, active: true },
      { onConflict: "profile_id,target_type,target_id" },
    );
  if (followError) throw new Error(`seedResearchThread follow: ${followError.message}`);

  const { error: linkError } = await db()
    .from("user_research")
    .update({ thread_id: threadId, status: "gevolgd" })
    .eq("id", input.researchId);
  if (linkError) throw new Error(`seedResearchThread link: ${linkError.message}`);

  return threadId;
}

/**
 * The full research-note creation path: extract (Phase 2), persist the note,
 * then seed + follow its thread synchronously — one function so
 * app/api/research/route.ts and any later caller (Phase 4's management API)
 * share the exact same create path. Returns the note with its thread linked.
 */
export async function createResearch(input: {
  profileId: string;
  title: string;
  body: string;
}): Promise<UserResearch> {
  const extraction = await extractResearch(input.title, input.body);
  const categoryId = await resolveCategoryId(extraction.categorySlug);

  const inserted = unwrap(
    await db()
      .from("user_research")
      .insert({
        profile_id: input.profileId,
        title: input.title,
        body: input.body,
        entities: extraction.entities,
        category_id: categoryId,
      })
      .select()
      .single(),
  ) as UserResearch;

  const threadId = await seedResearchThread({
    profileId: input.profileId,
    researchId: inserted.id,
    title: input.title,
    entities: extraction.entities,
    categoryId,
  });

  return { ...inserted, thread_id: threadId, status: "gevolgd" };
}

/**
 * Whether a thread originated from a research note — the sole detection
 * signal is the `user_research.thread_id` link (locked decision: no `threads`
 * schema change). Used only for generateThreadUpdate's framing (Phase 3),
 * never for matching — the pipeline's threadsStep treats a research thread
 * exactly like any other followed thread.
 */
export async function isResearchOriginThread(threadId: string): Promise<boolean> {
  const { data, error } = await db()
    .from("user_research")
    .select("id")
    .eq("thread_id", threadId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`isResearchOriginThread: ${error.message}`);
  return data != null;
}
