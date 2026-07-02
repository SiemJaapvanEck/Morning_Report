# HANDOFF — Entity Typing (Phases F1–F5)

> **Last updated:** 2 July 2026 (F5 session) — Siem (main)
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

Five phases — **all five now done and on main:**

- **F1** ✅ — `entities` registry table (migration) + seed + pure `modules/entities/` helpers.
- **F2** ✅ — Scan tags each entity with a type (registry-as-memory + write-back loop).
- **F3** ✅ — Threading uses the type (actors=umbrellas, products/events=facets). **The visible shallow reader fix.**
- **F4** ✅ — Relationships (product→actor) + variant canonicalization (deep layer). **Built and live-verified by Siem — closed.**
- **F5** ✅ — Typed entities + relationships feed Sol/redactie (actor-level cross-ref). **Built this session; awaiting Siem's localhost review.**

## Where we stand (this session — F5)

**The whole F1–F5 arc is code-complete and on main.** F5 is the payoff: "de rode
draad" (the front-page summary + the general roundup) now connects **actors**
across storylines, not just topics — e.g. Anthropic named across its Claude and
Fable storylines in one breath. It's pure enrichment of the existing editorial
call: **no migration, no new AI call, no schema change.** Full gate green
(**lint, tsc, 281 tests, build**). **Not yet live-verified** — pauses for Siem's
localhost review per the per-phase cadence.

### What F5 shipped

- **New pure helper `clusterByActor` (`modules/entities/index.ts`, unit-tested).**
  Takes the day's threads (`{ title, entities }[]`) + the registry and folds each
  thread's entities up to their umbrella **actor**: actors/persons anchor
  directly, products/events route to their parent actor (reusing F4's
  `parentActorKey`), places/other/unknown are ignored. A thread contributes its
  title once per distinct actor it touches. Returns only actors spanning **≥2
  threads** (a single thread under an actor is not a through-line and would just
  cost prompt tokens), sorted by cluster size desc then name. Empty registry ⇒
  `[]` (no-op), so it's safe to call unconditionally. Returns `ActorCluster[]`
  (`{ actor, type, items }`).
- **`composeDailyPaper` (`modules/redactie/index.ts`).** New **optional**
  `actorClusters: ActorCluster[] = []` param. When non-empty it adds a *"Spelers
  die vandaag terugkeren"* block to the prompt context plus one system clause
  telling the editor to connect developments at the actor level ("Anthropic
  bracht zowel X als Y uit"), not just per topic. Persona-free, Dutch,
  budget-aware — all unchanged. Optional + empty default ⇒ every existing caller
  and test is untouched.
- **`dailyPaperStep` (`modules/pipeline/steps.ts`).** After ranking the day's
  threads it calls `loadRegistry()`, builds the clusters with `clusterByActor`
  from the already-loaded `threads` (which carry `.entities`), and passes them
  into `composeDailyPaper`. No extra AI call — it enriches the existing editorial
  call; cost stays essentially flat (just a small context block).
- **+7 tests** (274 → 281): `clusterByActor` in `entities.test.ts` — folding,
  direct actor/person anchoring, ≥2-thread filtering, dedupe per actor, ignoring
  places/unknowns, size sorting, empty-registry no-op.

### Scope call worth flagging (Siem agreed, 2 Jul 2026)

- **Only `composeDailyPaper` gets the actor context this phase.**
  `writeDailyDigest` has no callers anymore; `composeSectionIntros` is per-section
  and actor cross-ref is inherently cross-section — both deliberately left.
- **No test added to `redactie.test.ts`.** The real new logic is `clusterByActor`
  (fully tested); the `composeDailyPaper` change is prompt-wiring glue and that
  module has no AI-mocking harness. Didn't introduce one just for string
  assembly. Revisit if Siem wants belt-and-braces coverage there.

## What's open

- **Live-verify F5 on localhost (the review gate).** On a real edition with
  recurring actors, confirm the front-page summary + general roundup draw
  actor-level through-lines (an actor named across its storylines) rather than
  walking topic by topic. It only fires when **≥2 of the day's threads share an
  actor**, so a quiet day correctly shows no change.
- **Verify the F2 scan saving live** (carried over) — spot-check `usage_log` on
  the next real edition to confirm scan cost dropped as the registry matured.
- **Pre-F3 thread cleanup — still deliberately LEFT.** The 4 pre-F3 product/event
  umbrellas (`fable 5`, `world cup`, `onlyfans`, `ai native games`) + 2 sibling
  facets stay in the DB until they age out. F4's dry-run confirmed there's no
  clean automated re-parent for them — revisit only if it still bothers.
- **The entity-typing arc is complete** — with F5 reviewed, the whole F1–F5 arc
  closes. No further phases planned; next direction is Siem's call.

## Known gotchas

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run.
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.
- The `entities` table is live; `0018_entity_parent` is the latest applied
  migration. Claude/Fable carry `parent_entity_id` → Anthropic.
- All F4/F5 helpers default to today's behaviour when the registry is empty or
  has no parent links — existing callers/tests unaffected. `clusterByActor`
  returns `[]` on an empty registry, and `composeDailyPaper`'s new param is
  optional, so the digest degrades gracefully to its old topic-only behaviour.
- **Untracked, deliberately not committed:** `Morning Report design/` (standalone
  HTML/JSX mockups) and 5 throwaway DB-mutation `scripts/*.ts`
  (`rebuild-threads`, `split-storylines`, `backfill-threads`, `regen-phase5`,
  `reparent-entities`) — kept for reuse; not part of the app.

## Next actions for Siem

1. **Review F5 on localhost** — on an edition where an actor recurs across
   storylines, does the front-page summary / general roundup now cross-reference
   at the actor level? If good, F5 (and the whole entity-typing arc) is closed.
2. **Decide the next direction** — the F1–F5 arc is done. Open candidates from
   memory: the news-threads build, the daily-paper re-imagination (Phase C/B/D),
   or the deep-research Phase 5 (Tavily grounding, needs a `TAVILY_API_KEY`).
