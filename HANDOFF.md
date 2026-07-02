# HANDOFF — Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 (later session) — Siem (main)
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

**F1–F3 are done, on main, and verified.** The shallow reader fix shipped last
session; **this session cleared two parked housekeeping items** (scan-cost tuning
+ throwaway-script cleanup) so F4 starts from a clean tree.

### Scan-cost tuning — done (the "trends cheaper as the registry matures" mechanism)

The F2 overshoot came from the scan emitting a `type` + `confidence` for **every**
entity, including ones already in the registry whose type we then discard
(registry wins). Fix, all in `modules/rank/index.ts`:

- `type`/`confidence` are now **optional** in `SCAN_SCHEMA` + `ScanVerdict`
  (only `name` is required).
- New prompt clause: for any entity already in the registry priming list, the
  model may send **`name` only** — we reuse the registry type. This is the actual
  mechanism that makes scan cheaper as the registry grows (before it was just a
  hope). Savings are modest early on and grow with the registry.
- The write-back mapping was extracted into a **pure, unit-tested**
  `buildEntityMaps()` helper with `?? "other"` / `?? "low"` floors for omitted
  fields. Verified safe: a known entity always keeps its **registry** type, and
  `mergeRegistryEntry` blocks an `ai_low` from downgrading a stronger existing
  row — so omission can't corrupt the registry.
- **Tests:** 6 new `buildEntityMaps` cases in `modules/rank/rank.test.ts`. Full
  suite **259 pass**. Gate green (lint, tsc, test, build).
- **Not yet measured live:** the token saving is real but wasn't verified against
  a real scan run. Spot-check the next edition's `usage_log` to confirm the trend.

### Script cleanup — done

Deleted the 6 read-only phase-verify one-offs (`verify-f3`, `verify-phase4`,
`verify-phase5`, `verify-phase5a`, `verify-threads`, `verify-anchor-threads`) —
untracked throwaways for phases already shipped. **Kept** the 4 DB-mutation
helpers (`rebuild-threads`, `split-storylines`, `backfill-threads`,
`regen-phase5`) since their logic may inform F4's canonicalization/re-parenting.

### F3 recap (prior session, still current)

The shallow fix: from the next edition on, a product/event can no longer open its
own umbrella next to its actor — it nests as a storyline facet. Live-verified by
Siem ("perfect like this"). Pure predicates (`resolveEntityType`,
`canAnchorUmbrella`, `canBeFacet`) in `modules/threads/index.ts`; registry-aware
branches in the anchor/facet selectors (all default to pre-F3 behaviour without a
registry); wired through the thread-plan step in `modules/pipeline/steps.ts` via
`loadRegistry()`. **Lenient policy:** only product/event are blocked from
anchoring; actors, persons, places and still-untyped (`other`) entities may still
anchor.

## What's open

- **Existing-thread cleanup — Siem chose to LEAVE them (option 1).** F3 is
  go-forward only; the 4 pre-F3 product/event umbrellas (`fable 5`, `world cup`,
  `onlyfans`, `ai native games`) and 2 sibling facets (`sk hynix`, `fifa`) stay in
  the DB until they age out. A re-parenting `--apply` rebuild was deliberately
  *not* run — that's closer to F4's canonicalization pass and would rewrite live
  thread data. Revisit during F4 if it still bothers.
- **Phase F4 — the next box.** Relationships (`parent_entity_id`, product→actor)
  + full variant canonicalization. **Backup checkpoint first:** at the start of
  F4, create and push `idle-work/2026-07-02-after-f3` from HEAD (snapshotting
  F1–F3) *before* writing any F4 code — Siem's standing call, so the shallow-fix
  state stays cleanly reviewable.
- **Verify the scan saving live** — check `usage_log` on the next real edition to
  confirm scan cost actually dropped (this session changed the code, not the
  measurement).

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
  a separate decision) and 4 throwaway DB-mutation `scripts/*.ts`
  (`rebuild-threads`, `split-storylines`, `backfill-threads`, `regen-phase5`) —
  kept for possible F4 reuse; the 6 read-only verify one-offs were deleted this
  session.

## Next actions for Siem

1. **Start Phase F4** — first push the `idle-work/2026-07-02-after-f3` backup
   branch from HEAD, then agree a short plan (per working agreements) before
   writing the relationships + canonicalization code.
2. Decide whether the scan-cost tuning item is worth acting on before/within F4.
