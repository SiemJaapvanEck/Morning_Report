# HANDOFF — idle run: Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 — idle run (Phase F2 complete)
> **Branch:** `idle-work/2026-07-02`, forked from `main` at `f9f0504`.
> **Sprint board + per-phase specs:** `docs/entity-typing-plan.md`.
> **Idle-session rituals:** `/start-idle` (open) and `/push-idle-branche` (close).

## What this run is

An overnight, autonomous build of **entity typing** — the fix for the storyline
fragmentation Siem saw in the umbrella reader (under *Anthropic*: "Claude" /
"Claude Science" / "Claude Sonnet 5" splitting into separate storylines; *Fable*
vs *Claude Fable 5* doubling up). The root cause: entities are flat strings, so
threading can't tell an **actor** (Anthropic) from a **product** (Claude) from an
**event** (an IPO). We attach a **type** to every entity via a growing DB
**registry**, then apply the rule: **umbrellas = actors, storylines = the
products/events an actor is involved in.**

Five phases, each its own scheduled session:

- **F1** ✅ — `entities` registry table (migration) + seed + pure `modules/entities/` helpers.
- **F2** ✅ — Scan tags each entity with a type (registry-as-memory + write-back loop).
- **F3** — Threading uses the type (actors=umbrellas, products/events=facets). **The visible reader fix.**
- **F4** — Relationships (product→actor) + variant canonicalization (deep layer).
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## What Phase F2 did (this session)

**Goal:** every scanned entity gets a type; the registry grows and stays consistent
via a single combined registry-as-memory + write-back loop. No extra AI call —
typing piggybacks the existing scan call.

### Files changed

- **`modules/entities/index.ts`** — added `buildRegistryPriming(registry, limit)`:
  builds a compact "Anthropic=actor, Claude=product, …" string for the scan prompt
  (seeds first, then ai_high, then ai_low, capped at 60 entries).

- **`modules/rank/index.ts`** — the scan schema and prompt:
  - `ScanVerdict.entities` changed from `string[]` to
    `{ name: string; type: string; confidence: string }[]`, constrained by the
    JSON schema to the six-value enum + high/low confidence.
  - `SCAN_SCHEMA` updated to match the new entity object shape.
  - `scanBatch` signature gains an optional `registry: EntityRegistry = new Map()`
    parameter (default empty → back-compat with existing callers and tests).
  - System prompt now includes the entity-type vocabulary and a `primingClause`
    drawn from the live registry ("al bekende entiteiten: Anthropic=actor, …").
  - `maxTokens` raised from 3500 → 5000 to accommodate the larger entity objects.
  - `ScanUitslag` gains three new fields alongside the existing `entities: string[]`
    (which is kept for back-compat, populated from display names as before):
    - `entity_types: Record<string, EntityType>` — norm_key → effective type
      (registry type wins over AI type for known entities; F3 reads this).
    - `entity_display: Record<string, string>` — norm_key → AI display name
      (used by write-back as `canonical_name` for new entities).
    - `entity_confidence: Record<string, "high" | "low">` — norm_key → AI
      confidence (used by write-back to set `EntityConfidence`).
  - Processing loop in `scanBatch`: for each entity the AI returns, normalizes
    the name via `normalizeEntity`, resolves to canonical via `resolveCanonical`,
    then stores the effective type (registry wins) + display + AI confidence.

- **`modules/pipeline/steps.ts`** — registry write-back in `scanRankStep`:
  - Loads the full entity registry from DB before the scan call.
  - Passes the registry to `scanBatch` (for prompt priming and canonical resolution).
  - After scan: collects all typed entities across all verdicts; for each unique
    norm_key, builds an `EntityRow` from AI data, merges with the existing registry
    entry via `mergeRegistryEntry` (seed > ai_high > ai_low), then batch-upserts to
    `entities` on conflict `norm_key`. Idempotent.
  - `scan_meta` update now includes `entity_types: verdict.entity_types` alongside
    the unchanged `entities` (display strings) and `events`.

- **`modules/entities/entities.test.ts`** — 4 new tests for `buildRegistryPriming`:
  empty registry → empty string; format check; seed-first ordering; limit cap.

### Gate

`npm run lint && npx tsc --noEmit && npm test && npm run build` → **green**.
239 tests passing (4 new in `entities.test.ts`).

### Decisions made autonomously

- **`entity_display` and `entity_confidence` in `ScanUitslag`**: added as two
  parallel maps (norm_key → display name / AI confidence) so the write-back step
  in `steps.ts` has all it needs without coupling rank to DB concerns. These are
  internal bookkeeping fields, not stored to `scan_meta`.
- **`maxTokens` 3500 → 5000**: entity objects are ~5× larger than bare strings;
  25 items × 5 entities × ~40 extra chars ≈ ~1250 extra tokens. The scan tier
  (Haiku/cheap model) keeps cost impact minimal.
- **Write-back collects across all verdicts, first-occurrence wins**: if two items
  in a batch give different types for the same entity, the first verdict in the
  loop wins — `mergeRegistryEntry` handles the actual merge logic, so a seed or
  ai_high entry in the registry still cannot be overridden by an ai_low new guess.

## What's next — Phase F3

**First unchecked box on the sprint board: Phase F3.**

Goal: threading uses entity types so the fragmentation Siem saw clears up.

What F3 needs:
- The `entities` table must be live (Siem applies `0017_entities.sql`) and F2's
  write-back must have run at least once so the registry has typed entries.
- **`modules/threads/index.ts`**: anchor selection uses `isUmbrellaType`
  (actor/person only may anchor an umbrella). Products/events become storyline
  facets, never sibling umbrellas — this directly fixes the "Claude" / "Fable"
  fragmentation.
- `primaryEntity` / `resolveThreadMeta` prefer the actor as umbrella identity;
  the salient product/event as the facet eyebrow.
- No schema change — reuses `parent_thread_id` / `anchor_entity` from migration 0009.
- A dry-run rebuild script (throwaway, not committed) to preview the re-derived
  umbrella/storyline assignment under the new typed rules.
- F3 is the last phase of the shallow fix — the visible payoff.

## Backup checkpoint after F3 (Siem's call)

F3 completes the *shallow* fix — the natural review point. **At the start of
Phase F4, the session must first create and push `idle-work/2026-07-02-after-f3`
from the current HEAD** (snapshotting F1–F3), then write F4 code.

## Standing rules for every idle session (non-negotiable)

- **This branch only. NEVER push `main`.** Siem merges in the morning after review.
- **Migration files only — never apply them live.** Author the numbered SQL in
  `supabase/migrations/`; Siem applies it via the Supabase connector in the morning.
  No live DB calls, no live pipeline run, no paid AI calls at night.
- **"Done" = code written + gate green + migration authored**, not live-verified.
  The gate is `npm run lint && npx tsc --noEmit && npm test && npm run build`.
- **Architecture invariants hold** (CLAUDE.md): pure `modules/`; step-machine
  pipeline (idempotent, ~7s/step); every AI call via `askAI()`; typing
  **piggybacks the existing scan call** (no extra AI call); registry write-back is
  an idempotent upsert on `norm_key`. Budget ceiling unchanged (€0.15, aim €0.10).
- **Bug-backup rule:** before any risky rewrite, checkpoint so nothing green is lost.
- **If blocked:** stop, checkpoint, write an honest HANDOFF, and leave the board
  accurate. **Never fake a green gate.**
- Close every session with `/push-idle-branche` (rewrites this HANDOFF on the
  branch, ticks the board, runs the gate, commits + pushes to this branch only).

## Known gotchas

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate identifier".
  Fix: `find .next -name "* 2.*" -delete` then re-run.
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.
- The `entities` table does not exist until Siem applies `0017_entities.sql`. The
  `db().from("entities")` call in `scanRankStep` will fail at runtime until then.

## Morning review (Siem)

1. Read this file + `docs/entity-typing-plan.md` (board shows how far it got).
2. Apply `supabase/migrations/0017_entities.sql` via the Supabase connector
   (required before F2's write-back and F3's type lookups can run live).
3. Start the next scheduled idle session for Phase F3 (or continue manually).
4. Live cost verification of the scan step: target ≤ €0.10 per edition; the
   raised maxTokens (5000) slightly increases output tokens but stays on the
   cheap scan tier.
5. Eventual live verification of the reader fix (F3 payoff) on `localhost:3000`.
6. Decide on merging `idle-work/2026-07-02` → `main`. The
   `idle-work/2026-07-02-after-f3` branch will be the shallow-only fallback
   (created at the start of F4).
