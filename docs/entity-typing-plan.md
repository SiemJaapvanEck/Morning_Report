# Entity Typing — sprint board & implementation plan

> **How we run this:** one phase = one sprint. Implement a phase, pass the full
> gate, **pause for Siem's review on localhost before starting the next**. A new
> session picks up at the first unchecked box. Continues the arc from
> `docs/threads-plan.md` (Phase D2's "Known gap → entity typing").

## The problem in one paragraph

Entities today are **flat strings** on `items.scan_meta.entities` (e.g.
`["Anthropic", "Claude", "Claude Science"]`). The threading logic can't tell an
**actor** (Anthropic — a thing that *does* things) from a **product** (Claude —
a thing that *gets done to*) from an **event** (an IPO). So when one actor ships
several things, each product name looks equally load-bearing and spawns its own
storyline. Result: the fragmentation visible in the umbrella reader — under
*Anthropic*, "Claude" / "Claude Science" / "Claude Sonnet 5" split apart;
*Fable* vs *Claude Fable 5* double up. Threads-plan D2 flagged this as the real
fix.

**Entity typing = attach a *kind* to every entity** (actor / product / event /
place / person), stored in a growing **registry** the pipeline builds up over
time. Then the model gets a clean, human rule:

> **Umbrellas = actors. Storylines = the products / events an actor is involved in.**

## Design decisions (Siem, 1 Jul 2026)

- **Source of the type = AI + dictionary, combined and self-growing** (Siem's
  call). The scan does **not** guess in a vacuum: it reads the existing registry
  first, reuses a known entity's type for consistency, and only invents a type
  for genuinely new entities — then **writes the new entity back** into the
  registry so the next run is consistent.
- **The registry is a *prior*, not gospel** (engineer's guardrail, agreed). A
  bad auto-written entry must never bake in permanently: new/low-confidence
  entries are logged and correctable; the model may override a registry type
  only with high confidence; the hand-written alias map seeds the table.
- **The dictionary becomes a real DB table**, not a hardcoded `.ts` const —
  because the AI writes to it. This is an *extension* (migration + pure helper +
  new step logic), never a rewrite. The existing alias map in
  `modules/threads/index.ts` is the **seed**.
- **Ship shallow first, design for deep.** Phases F1–F3 fix the reader with
  types only. Relationships (product→actor) + the Sol cross-ref upgrade are
  F4–F5, added once the shallow fix is reviewed — but the schema and vocabulary
  are chosen up front so they bolt on without a migration rewrite.
- **Type vocabulary is small and fixed** (avoids model drift): `actor`
  (org/company/group), `person`, `product`, `event`, `place`, `other`. Actors
  and persons anchor umbrellas; products and events become facets; places stay
  datelines (never anchor, matching today's `isAnchorableEntity`).

## Idle run (2 Jul 2026) — how these sprints execute unattended

This whole arc (F1→F5) is scheduled as an **overnight idle coding run** on branch
`idle-work/2026-07-02`, one session per phase (see `/setup-idle-work`). The
per-phase "pause for Siem's review on localhost" collapses into **one morning
review of the whole branch** — Siem applies the migration files, live-verifies the
reader fix, and decides on merging back to `main`. Idle sessions therefore treat
"done" as **code written + gate green + migration file authored**, never
live-verified.

**Backup checkpoint after F3 (Siem's call, 2 Jul 2026):** F3 is the last phase of
the *shallow* fix and the natural review point. So **at the start of Phase F4, the
session must first create and push a backup branch `idle-work/2026-07-02-after-f3`
from the current HEAD** (capturing F1–F3) before writing any F4 code. That
preserves a clean, reviewable shallow-fix state in case the deep layer (F4/F5) or
Siem's review calls for reworking it — the deep layer builds on F1–F3, so we snapshot
first.

## Sprint board

- [x] **Phase F1** — Entity registry table + seed + pure helpers
- [ ] **Phase F2** — Scan tags type (registry-as-memory, write-back loop)
- [ ] **Phase F3** — Threading uses type (actors=umbrellas, products/events=facets)
- [ ] **backup checkpoint** — push `idle-work/2026-07-02-after-f3` (start of F4)
- [ ] **Phase F4** — Relationships (product→actor) + variant canonicalization
- [ ] **Phase F5** — Feed typed entities into Sol/redactie (actor-level cross-ref)

---

## Phase F1 — Entity registry table + seed + pure helpers

**Goal:** stand up the storage and pure logic, change no behaviour yet. Fully
non-destructive and independently reviewable.

- **Migration** (numbered, via Supabase connector): `entities` table —
  `id`, `canonical_name` (display form), `norm_key` (unique, from
  `normalizeEntity`), `type` (enum: the six above), `aliases text[]`,
  `confidence` (`seed` / `ai_high` / `ai_low`), `first_seen_edition`,
  `created_at`, `updated_at`. Index on `norm_key`. Keep `modules/shared/types.ts`
  in sync.
- **Seed** from the existing alias map + `isAnchorableEntity` datelines →
  `place`; a small hand-curated set of obvious actors/products for the entities
  we already know recur (Anthropic, OpenAI, SpaceX, NASA, Claude, Fable…).
- **Pure helpers** in a new `modules/entities/` (framework-agnostic, tested):
  `typeOf(normKey, registry)`, `mergeRegistryEntry(...)`, `isUmbrellaType(type)`
  (actor|person), `isFacetType(type)` (product|event), plus the alias→canonical
  resolution moved here from threads. vitest coverage in the module's style.
- **No pipeline wiring, no scan change, no threading change.** Gate green.

## Phase F2 — Scan tags type (registry-as-memory + write-back)

**Goal:** every scanned entity gets a type; the registry grows and stays
consistent. This is the 1+2 combined loop.

- **Scan prompt/schema** (`modules/rank/index.ts`): each entity returns
  `{ name, type }` instead of a bare string. The prompt is **primed with the
  registry's known types** for entities present in the batch ("these are already
  known: Anthropic=actor, Claude=product — reuse unless clearly wrong"), and
  constrained to the six-value enum.
- **Write-back** (in the scan step, `modules/pipeline/steps.ts`): after the
  call, upsert new entities into `entities` (confidence `ai_high`/`ai_low`);
  known entities keep their registry type unless the model overrides with high
  confidence. Batched, **idempotent**, within the ~7s budget (one extra upsert,
  no extra AI call — piggybacks the scan call we already pay for).
- **Storage:** `scan_meta.entities` keeps display strings for back-compat;
  add `scan_meta.entity_types` (norm_key → type) so nothing downstream breaks
  before F3 reads it. Verify live cost is unchanged (target still ≤ €0.10).
- Gate green; a `scripts/` dry-run to preview the type assignments over recent
  editions (throwaway, uncommitted, per house rule).

## Phase F3 — Threading uses type (the reader fix)

**Goal:** the fragmentation Siem saw in the reader clears up.

- **Anchor selection** (`modules/threads/index.ts`): only `isUmbrellaType`
  entities (actor/person) may anchor an umbrella; `isFacetType` entities
  (product/event) become **storyline facets**, never sibling umbrellas. This
  directly fixes D2's known gap — a recurring *product* (Mythos) no longer gets
  suppressed as a sibling; it nests as a facet under its actor.
- **`primaryEntity` / `resolveThreadMeta`** prefer the actor as the umbrella
  identity and the salient product/event as the facet eyebrow.
- **Product-version collapse:** "Claude Fable 5" / "Fable" resolve to one facet
  via the registry's alias set (F1), killing the double-up.
- **No schema change** (reuses `parent_thread_id`/`anchor_entity` from 0009).
  Ship a **rebuild script** (dry-run + `--apply`) to re-derive umbrellas/
  storylines from history under the new typed rules, like `split-storylines.ts`.
- Verify **on localhost** in the umbrella reader — this is the visible payoff.

## Phase F4 — Relationships + variant canonicalization (deep layer)

**Goal:** record *which actor a product belongs to*, so cross-referencing has
real connective tissue. Additive to F1's table.

- Add `parent_entity_id` (product→actor) to `entities` (nullable). Scan infers
  it when obvious ("Claude, Anthropic's model…"); registry remembers it.
- Full canonicalization pass: variants collapse to one canonical entity with an
  alias list; the registry becomes the single source of truth for identity.
- Umbrella/storyline assignment can now use the explicit product→actor link
  instead of co-occurrence heuristics. Gate green; rebuild script re-run.

## Phase F5 — Sol / redactie cross-reference upgrade (the payoff)

**Goal:** Sol connects **actors**, not just topics — "de rode draad" gets its
teeth.

- Feed the **typed entities + relationships** into the digest context
  (`modules/redactie/index.ts` currently sees only topic names + headlines).
- Prompt shift: group and connect by actor/product across topics ("Anthropic
  shipped Claude Science and Claude Sonnet 5; both OpenAI and Anthropic moved on
  AI-for-science this week"), still persona-free, still Dutch output, still
  budget-aware.
- Verify live: cost within ceiling, digest visibly draws actor-level through-lines.

---

## Idempotency & budget invariants (hold throughout)

- No extra AI call: typing **piggybacks** the existing scan call. Registry
  write-back is a plain upsert, idempotent on `norm_key`.
- Every step stays under ~7s; re-running an edition converges (fixed point).
- Budget ceiling unchanged (`BUDGET_EDITION_EUR` €0.15, aim €0.10); the guard's
  degrade path is untouched.
- Registry is correctable: bad `ai_low` entries can be fixed without a code
  change (they're data), and seeds/high-confidence entries are the trusted core.

## Critical files

- `supabase/migrations/00xx_entities.sql` (F1), `..._entity_parent.sql` (F4)
- `modules/entities/` — new pure module + tests (F1)
- `modules/shared/types.ts` — `Entity` type in sync (F1)
- `modules/rank/index.ts` — scan schema + prompt (F2)
- `modules/pipeline/steps.ts` — registry write-back in the scan step (F2)
- `modules/threads/index.ts` — typed anchor/facet selection (F3), alias seed moves out (F1)
- `modules/redactie/index.ts` — typed cross-ref context (F5)
- `scripts/` — throwaway dry-run + rebuild scripts (F2, F3, F4)
