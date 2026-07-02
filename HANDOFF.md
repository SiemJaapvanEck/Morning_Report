# HANDOFF — idle run: Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 — idle run (Phase F1 complete)
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
- **F2** — Scan tags each entity with a type (registry-as-memory + write-back loop).
- **F3** — Threading uses the type (actors=umbrellas, products/events=facets). **The visible reader fix.**
- **F4** — Relationships (product→actor) + variant canonicalization (deep layer).
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## What Phase F1 did (this session)

**Goal:** stand up storage and pure logic. No behaviour change.

### Files changed / created

- **`supabase/migrations/0017_entities.sql`** (new, NOT applied — Siem applies in
  the morning): creates `entity_type` enum (`actor|person|product|event|place|other`)
  and `entity_confidence` enum (`seed|ai_high|ai_low`), then the `entities` table
  (`id`, `canonical_name`, `norm_key` unique+indexed, `type`, `aliases text[]`,
  `confidence`, `first_seen_edition`, `created_at`, `updated_at`). Seeds 27 rows:
  - DATELINE_STOPLIST entries → `place` (matches today's `isAnchorableEntity`)
  - Alias-map canonical targets (ukraine, russia, lebanon) → `place`; trump → `person`
  - Institutional actors: Federal Reserve, Warner Bros, Anthropic, OpenAI, SpaceX, NASA
  - AI products: `claude` (aliases: claude science, claude sonnet 5, etc.),
    `fable` (aliases: claude fable 5, claude fable, fable 5) — the key
    fragmentation sources from the spec

- **`modules/shared/types.ts`** (updated): added `EntityType`, `EntityConfidence`,
  and `Entity` interface in sync with the migration.

- **`modules/entities/index.ts`** (new pure module): `buildRegistry()`,
  `typeOf()`, `isUmbrellaType()`, `isFacetType()`, `resolveCanonical()`,
  `mergeRegistryEntry()`. No framework imports, no DB calls.

- **`modules/entities/entities.test.ts`** (new): 15 vitest tests covering all
  helpers. The key `mergeRegistryEntry` decision: `first_seen_edition` is
  immutable once set; seed rows have `null` (pre-date all editions) and a
  later AI-discovered entry for the same entity does not overwrite it.

### Gate

`npm run lint && npx tsc --noEmit && npm test && npm run build` → **green**.
235 tests passing (15 new in `entities.test.ts`).

## What's next — Phase F2

**First unchecked box on the sprint board: Phase F2.**

Goal: every scanned entity gets a type; the registry grows and stays consistent.

What F2 needs:
- The `entities` table must be live (Siem applies `0017_entities.sql` first).
- **Scan prompt/schema** (`modules/rank/index.ts`): each entity returns
  `{ name, type }` instead of a bare string. The scan prompt is primed with known
  registry types for entities in the batch and constrained to the six-value enum.
- **Write-back** in the scan step (`modules/pipeline/steps.ts`): upsert new entities
  into `entities` (confidence `ai_high`/`ai_low`) after the scan call. Idempotent
  upsert on `norm_key`. No extra AI call — piggybacks the existing scan.
- `scan_meta.entities` keeps display strings (back-compat); add
  `scan_meta.entity_types` (norm_key → type) so F3 can read the typed data.

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

## Morning review (Siem)

1. Read this file + `docs/entity-typing-plan.md` (board shows how far it got).
2. Apply `supabase/migrations/0017_entities.sql` via the Supabase connector.
3. Start the next scheduled idle session for Phase F2 (or merge if you prefer to
   continue manually).
4. Eventual live verification of the reader fix (F3 payoff) on `localhost:3000` in
   a real desktop browser — the headless preview reports a 0-width viewport.
5. Decide on merging `idle-work/2026-07-02` → `main`. The
   `idle-work/2026-07-02-after-f3` branch will be the shallow-only fallback
   (created at the start of F4).
