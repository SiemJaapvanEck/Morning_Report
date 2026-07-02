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
- **F3** — Threading uses the type (actors=umbrellas, products/events=facets). **The visible reader fix.** ← next
- **F4** — Relationships (product→actor) + variant canonicalization (deep layer).
- **F5** — Feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## Where we stand (this session)

**F1 + F2 are now LIVE, and the F3 gate is fully clear.** This session did not
write F3 code — it took F1/F2 from "merged but dormant" to "running against the
live DB," and verified the result:

- **Migration `0017_entities.sql` applied** to the live Supabase project
  (`iqhyndhrlhjfdrwjvmjv`) — it is now the latest migration
  (`20260702094459_0017_entities`). Enums + `entities` table + index + RLS +
  seed rows all committed in one transaction.
- **Permission change (Siem's call):** `.claude/settings.json` had a hard
  `deny` on the Supabase `apply_migration` tool — this blocked the migration
  with no prompt to approve. Siem chose to **drop that rail permanently** (the
  other four rails — `execute_sql`, `deploy_edge_function`, `merge_branch`,
  `reset_branch` — stay denied). This is why the settings change is in this
  commit; it must persist so future interactive sessions can apply migrations.
- **F2 write-back ran** via one full `npm run pipeline` (a complete edition for
  today, all steps green). The `entities` table grew from **25 seed rows →
  313 rows** (286 `ai_high`, 2 `ai_low`, 25 seeds preserved with their `seed`
  confidence). Type spread: product 109, place 75, actor 54, other 42,
  person 29, event 4.
- **Fragmentation-critical entities verified correctly typed and seed-protected:**
  Anthropic/OpenAI/SpaceX/NASA/Federal Reserve/Warner Bros = `actor/seed`;
  Claude (8 aliases) & Fable (3 aliases) = `product/seed`; Trump = `person/seed`.
  The write-back did not clobber the trusted seed core.

### Cost check (⚠️ scan slightly over target)

From `usage_log` for the run (45 AI calls, full edition €0.2321):

| Step | Cost | Calls |
|---|---|---|
| `scan_rank` | **€0.1251** | 8 |
| `generate` | €0.0955 | 33 |
| `daily_paper` | €0.0115 | 4 |

Scan came in **~25% over the €0.10/edition target**. Cause: the `maxTokens`
3500→5000 raise plus richer output (each entity is now a `{name,type,confidence}`
object, not a bare string), and this edition ingested a large two-wave batch
(8 scan calls). Not blocking — the registry is a growing asset, so future runs
should mostly hit existing rows and trend cheaper. **Parked as a tuning item**
(options: emit type/confidence only for non-place entities, or drop `maxTokens`
back once the registry matures).

## What's next — Phase F3 (gate is now clear)

**First unchecked box on the sprint board: Phase F3.** Everything F3 reads is now
in place (typed registry populated, migration live). No plan has been agreed yet
— draft one before writing code.

What F3 needs:
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
- The `entities` table is now live and populated — the earlier "table does not
  exist until applied" caveat no longer applies.
- **Untracked, deliberately not committed:** `Morning Report design/` (6.8M of
  standalone HTML/JSX mockups — referenced by CLAUDE.md but not yet tracked;
  a separate decision) and several throwaway `scripts/*.ts` (verify/rebuild
  dry-run helpers from prior sessions).

## Next actions for Siem

1. **Start Phase F3** — agree a short plan first (per working agreements), then
   implement in `modules/threads/index.ts` with a throwaway dry-run rebuild to
   preview the re-derived umbrellas.
2. Live verification of the reader fix (F3 payoff) on `localhost:3000`.
3. Decide whether to act on the scan-cost tuning item now or after F3.
