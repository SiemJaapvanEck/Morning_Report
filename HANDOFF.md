# HANDOFF — Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 — Siem (main)
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
- **F3** ✅ — Threading uses the type (actors=umbrellas, products/events=facets). **The visible reader fix — shipped.**
- **F4** — Relationships (product→actor) + variant canonicalization (deep layer). ← next
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## Where we stand (this session)

**F3 is done, on main, and verified.** The shallow fix is complete: from the
next edition on, a product/event can no longer open its own umbrella next to its
actor — it nests as a storyline facet instead. Live-verified by Siem on
`localhost:3000` ("perfect like this").

What this session built (all in three tracked files, no schema change):

- **Pure predicates** in `modules/threads/index.ts`: `resolveEntityType`
  (registry-aware type of a normalized key, folding aliases), `canAnchorUmbrella`
  (blocks `product`/`event` from anchoring), `canBeFacet` (blocks `actor`/`person`
  from being a facet).
- **Registry-aware branches** added to `primaryEntity`, `dominantEntity`,
  `bigTopicAnchors`, `personalAnchors`, `storylineFacets` — each takes an
  **optional** `registry` and falls back to the exact old behaviour when it's
  absent, so nothing outside the thread-plan step changed.
- **Lenient policy (Siem's call):** only facet types (product/event) are blocked
  from anchoring; actors, persons, places **and still-untyped (`other`)**
  entities may still anchor. This targets the fragmentation bug without starving
  new/untyped actors of their own umbrella.
- **Wiring** in `modules/pipeline/steps.ts`: the thread-plan step loads the
  registry once via the new `loadRegistry()` DB helper and threads it through
  anchor + facet selection, plus a `canAnchorUmbrella` filter next to the
  existing dateline filter.
- **Tests:** 20 new F3 cases in `modules/threads/threads.test.ts`. Full suite
  **253 pass**. Gate green (lint, tsc, test, build).

### Dry-run preview (read-only, live DB)

`scripts/verify-f3.ts` (throwaway, uncommitted) confirmed the effect against the
live registry (313 rows, 121 umbrellas, 32 storylines):

- **4 existing umbrellas are really facet types** and would collapse under the
  new rules: `fable 5` (product — the exact double-up), `world cup` (event),
  `onlyfans` (product), `ai native games` (product).
- **2 existing facets are really actors** (siblings): `sk hynix`, `fifa`.
- Umbrella-anchor type spread: `other=88, actor=17, place=9, person=3,
  product=3, event=1` — the 88 untyped stay anchoring, as the lenient policy
  intends.

## What's open

- **Existing-thread cleanup — Siem chose to LEAVE them (option 1).** F3 is
  go-forward only; the 4 pre-F3 product/event umbrellas above (and the 2 sibling
  facets) stay in the DB until they age out. A re-parenting `--apply` rebuild was
  deliberately *not* run — that's closer to F4's canonicalization pass and would
  rewrite live thread data. Revisit during F4 if it still bothers.
- **Phase F4 — the next box.** Relationships (`parent_entity_id`, product→actor)
  + full variant canonicalization. **Backup checkpoint first:** at the start of
  F4, create and push `idle-work/2026-07-02-after-f3` from HEAD (snapshotting
  F1–F3) *before* writing any F4 code — Siem's standing call, so the shallow-fix
  state stays cleanly reviewable.
- **Scan-cost tuning (parked since F2).** Scan ran ~25% over the €0.10/edition
  target after the F2 `maxTokens` raise + richer entity output. Not blocking;
  should trend cheaper as the registry matures. Options: emit type/confidence
  only for non-place entities, or drop `maxTokens` back.

## Known gotchas

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate identifier".
  Fix: `find .next -name "* 2.*" -delete` then re-run.
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.
- The `entities` table is live and populated (313 rows); migration
  `0017_entities` is the latest applied migration.
- F3's registry-aware pure functions all default to the pre-F3 behaviour when no
  registry is passed — existing callers/tests are unaffected; only the pipeline
  thread-plan step passes the registry.
- **Untracked, deliberately not committed:** `Morning Report design/` (6.8M of
  standalone HTML/JSX mockups — referenced by CLAUDE.md but not yet tracked;
  a separate decision) and several throwaway `scripts/*.ts` (verify/rebuild
  dry-run helpers, including this session's `scripts/verify-f3.ts`).

## Next actions for Siem

1. **Start Phase F4** — first push the `idle-work/2026-07-02-after-f3` backup
   branch from HEAD, then agree a short plan (per working agreements) before
   writing the relationships + canonicalization code.
2. Decide whether the scan-cost tuning item is worth acting on before/within F4.
