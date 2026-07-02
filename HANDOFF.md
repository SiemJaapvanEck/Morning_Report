# HANDOFF — Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 — merged to main from `idle-work/2026-07-02`
> **Sprint board + per-phase specs:** `docs/entity-typing-plan.md`.

## What this arc is

An autonomous build of **entity typing** — the fix for the storyline
fragmentation Siem saw in the umbrella reader (under *Anthropic*: "Claude" /
"Claude Science" / "Claude Sonnet 5" splitting into separate storylines; *Fable*
vs *Claude Fable 5* doubling up). The root cause: entities are flat strings, so
threading can't tell an **actor** (Anthropic) from a **product** (Claude) from an
**event** (an IPO). We attach a **type** to every entity via a growing DB
**registry**, then apply the rule: **umbrellas = actors, storylines = the
products/events an actor is involved in.**

Five phases:

- **F1** ✅ — `entities` registry table (migration) + seed + pure `modules/entities/` helpers.
- **F2** ✅ — Scan tags each entity with a type (registry-as-memory + write-back loop).
- **F3** — Threading uses the type (actors=umbrellas, products/events=facets). **The visible reader fix.**
- **F4** — Relationships (product→actor) + variant canonicalization (deep layer).
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## What landed in this merge (F1 + F2)

### Phase F1 — Entity registry table + seed + pure helpers

- **`supabase/migrations/0017_entities.sql`** (NOT yet applied): creates
  `entity_type` enum (`actor|person|product|event|place|other`) and
  `entity_confidence` enum (`seed|ai_high|ai_low`), then the `entities` table
  with 27 seed rows covering dateline places, alias-map targets, persons, actors,
  and key AI products (Claude, Fable).
- **`modules/shared/types.ts`**: added `EntityType`, `EntityConfidence`, `Entity`.
- **`modules/entities/index.ts`**: new pure module — `buildRegistry`, `typeOf`,
  `isUmbrellaType`, `isFacetType`, `resolveCanonical`, `mergeRegistryEntry`,
  `buildRegistryPriming`. No framework imports, no DB calls.
- **`modules/entities/entities.test.ts`**: 19 vitest tests.

### Phase F2 — Scan entity typing + registry write-back

- **`modules/rank/index.ts`**: scan schema now returns entities as
  `{ name, type, confidence }` objects (six-value enum + high/low confidence).
  `scanBatch` gains an optional `registry` parameter for prompt priming and
  canonical resolution. `ScanUitslag` gains `entity_types` (norm_key → type for
  F3), `entity_display`, and `entity_confidence` for the write-back path.
  `maxTokens` 3500 → 5000.
- **`modules/pipeline/steps.ts`**: `scanRankStep` loads the entity registry before
  the scan, passes it to `scanBatch`, then batch-upserts typed entities to the
  `entities` table after each scan. Idempotent on `norm_key`. `scan_meta` now
  stores `entity_types` (norm_key → type) alongside the unchanged `entities`
  display strings.
- **`modules/entities/entities.test.ts`**: 4 additional tests for `buildRegistryPriming`.

### Gate (both phases)
`npm run lint && npx tsc --noEmit && npm test && npm run build` → **green**.
239 tests passing.

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

## Known gotchas

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate identifier".
  Fix: `find .next -name "* 2.*" -delete` then re-run.
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.
- The `entities` table does not exist until Siem applies `0017_entities.sql`. The
  `db().from("entities")` call in `scanRankStep` will fail at runtime until then.

## Next actions for Siem

1. Apply `supabase/migrations/0017_entities.sql` via the Supabase connector
   (required before F2's write-back and F3's type lookups can run live).
2. Verify live cost of the scan step: target ≤ €0.10 per edition; the raised
   `maxTokens` (5000) slightly increases output tokens but stays on the cheap
   scan tier.
3. Start Phase F3 — either manually or via a new idle run.
4. Live verification of the reader fix (F3 payoff) on `localhost:3000`.
