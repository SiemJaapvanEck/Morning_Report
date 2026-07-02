# HANDOFF — Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 (F4 session) — Siem (main)
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
- **F3** ✅ — Threading uses the type (actors=umbrellas, products/events=facets). **The visible shallow reader fix.**
- **F4** ✅ — Relationships (product→actor) + variant canonicalization (deep layer). **Built this session; awaiting Siem's localhost review.**
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref). ← next

## Where we stand (this session — F4)

**F1–F4 are done and on main.** Before writing any F4 code the session pushed a
backup branch **`idle-work/2026-07-02-after-f3`** from HEAD (Siem's standing
call), snapshotting the clean shallow-fix state. F4 then added the deep layer:
the registry now records **which actor a product belongs to**, and threading
routes a product's news to its actor's umbrella even when the article never names
the actor. Full gate green (**lint, tsc, 274 tests, build**). **Not yet
live-verified** — this pauses for Siem's localhost review per the per-phase
cadence.

### What F4 shipped

- **Migration `0018_entity_parent.sql` (applied live).** Adds nullable,
  self-referential `entities.parent_entity_id` (`on delete set null`) + index.
  Seeds the two known links: Claude → Anthropic, Fable → Anthropic (by norm_key
  subquery, so it's id-agnostic and idempotent). `Entity`/`EntityRow` synced in
  `modules/shared/types.ts`.
- **Pure helpers (`modules/entities/index.ts`, unit-tested).**
  `buildEntityById` (id→Entity index, since the registry is keyed by norm_key),
  `parentActorKey` (product norm_key → its actor's norm_key, folding aliases),
  and `expandWithParents` (append each product's parent actor to an entity list,
  de-duped, originals-first; identity map on an empty registry).
  `mergeRegistryEntry` extended: a parent link once set is **never nulled** by a
  later scan that omits it, but an **unset** link can be filled by an inferred
  parent (`existing.parent_entity_id ?? incoming.parent_entity_id`).
- **Scan inference (`modules/rank/index.ts`).** Each scanned entity may carry an
  optional `parent` (the actor a product belongs to), with a prompt clause that
  demands it only when explicit ("Claude, het model van Anthropic"). No extra AI
  call — piggybacks the existing scan. `buildEntityMaps` records the parent only
  for facet-type entities, folds the parent name to canonical, drops
  self-references → new `entity_parents` map on `ScanUitslag`.
- **Write-back (`modules/pipeline/steps.ts`).** Resolves the inferred parent to
  its registry **id**, but **only when the actor is already a known row** (the FK
  requires it). New actors link on a later edition once they've been written —
  idempotent and convergent.
- **The payoff — parent-expansion routing (`threadsStep`).** Right after loading
  candidates, each item's entities are expanded with their parent actor, so an
  item that names only "Claude" also carries "anthropic" and flows into the
  Anthropic umbrella — the connective tissue F3's co-occurrence heuristic
  couldn't provide. The parent key is **appended last**, so a directly-named
  actor still outranks an inferred one in `matchByAnchor`. Empty/parent-less
  registry ⇒ identity (no-op), so every existing caller keeps today's behaviour.
- **+15 tests** (259 → 274): parent helpers + merge-preservation in
  `entities.test.ts`, parent inference in `rank.test.ts`, and an
  integration-style routing test (`expandWithParents` + `matchByAnchor`) in
  `threads.test.ts`.

### Variant canonicalization — deliberately script-only (Siem's call, 2 Jul 2026)

The spec's "full variant canonicalization" was scoped **away from the live hot
path**: no code auto-merges entities. Instead a throwaway dry-run script,
`scripts/reparent-entities.ts` (untracked, like the other DB-mutation helpers),
previews (1) product→actor re-parenting from co-occurrence evidence and (2)
likely variant collapses — and `--apply` writes **parent links only**, never
merges. **Ran the dry-run this session:** across 111 parent-less products it
found essentially nothing to backfill (one weak `Starlink → SpaceX` at 1×
co-occurrence, below the confidence bar; the rest are one-off arXiv-style paper
names). Takeaway: **F4's value is the forward path** (scan inference +
parent-expansion), not history rewriting — so no `--apply` was run.

## What's open

- **Live-verify F4 on localhost (the review gate).** In the umbrella reader,
  confirm a product-only item (e.g. a "Claude" story with no "Anthropic" in the
  text) now nests under the Anthropic umbrella. The one behaviour change to
  eyeball is the parent-expansion in `threadsStep`.
- **Phase F5 — the payoff.** Feed typed entities + the new product→actor
  relationships into Sol/redactie so "de rode draad" connects **actors**, not
  just topics. See `docs/entity-typing-plan.md` §F5.
- **Verify the F2 scan saving live** (carried over from last session) — spot-check
  `usage_log` on the next real edition to confirm scan cost dropped as the
  registry matured.
- **Pre-F3 thread cleanup — still deliberately LEFT.** The 4 pre-F3 product/event
  umbrellas (`fable 5`, `world cup`, `onlyfans`, `ai native games`) + 2 sibling
  facets stay in the DB until they age out. F4's dry-run confirmed there's no
  clean automated re-parent for them either — revisit only if it still bothers.

## Known gotchas

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run.
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.
- The `entities` table is live; `0018_entity_parent` is now the latest applied
  migration (was `0017_entities`). Claude/Fable carry `parent_entity_id` →
  Anthropic.
- F4's parent helpers all default to today's behaviour when no registry / no
  parent links are present — existing callers/tests unaffected; only the
  thread-plan step (with the loaded registry) sees the expansion.
- **Untracked, deliberately not committed:** `Morning Report design/` (standalone
  HTML/JSX mockups) and 5 throwaway DB-mutation `scripts/*.ts`
  (`rebuild-threads`, `split-storylines`, `backfill-threads`, `regen-phase5`, and
  now `reparent-entities`) — kept for reuse; not part of the app.

## Next actions for Siem

1. **Review F4 on localhost** in the umbrella reader (does a Claude-only item sit
   under Anthropic?). If good, F4 is closed.
2. **Start Phase F5** — agree a short plan (per working agreements) before wiring
   typed entities + relationships into `modules/redactie/index.ts`.
