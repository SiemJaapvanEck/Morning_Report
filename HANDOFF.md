# HANDOFF — MOR-3 Tavily citation UI merged to main

> **Last updated:** 21 July 2026 (interactive session with Siem) —
> merged `MOR-3-tavily-citation-ui-2026-07-21` → `main`

## Where we stand

`main` has the orchestrator workflow v2 + the krant "A2 · Dagblad +
Verhaallijn" rebuild (`0ae2df5`) and now **MOR-3 (Tavily citation UI)**,
reviewer-approved and double-gate merged. Next up: Siem is starting a `/prd`
for the first substantial new initiative.

## This session

1. **Merged** `idle-work/2026-07-02-krant-a3` → main (double gate green,
   `0ae2df5`); deleted that branch; pruned 16 spurious `" 2."` duplicate files.
2. **Investigated the backlog** for `/plan` and found the docs are badly stale:
   the entire News-Threads **D3→E umbrella-viz arc is already built, merged, and
   live-verified** (master–detail reader, `18a50fc`), entity-typing **F5** is on
   main, and **Tavily grounding Phase 5** is fully coded — gated only on
   `TAVILY_API_KEY`. See `~/.claude/plans/dazzling-stargazing-sonnet.md` for the
   corrected state-of-the-world.
3. **Built MOR-3 — Tavily citation UI** (commit `89b80a8`). Tavily grounding was
   fed into the synthesis prompt and then discarded; now the web sources are
   persisted on the article and surfaced as the "+N extra bronnen via Tavily"
   accent row in RUBRIEK IN CIJFERS. Four thin layers, **no migration**:
   - `modules/shared/types.ts`: `DeepArticle.groundingSources?: GroundingSource[]`
     (optional → JSONB additive, back-compat).
   - `modules/generate/index.ts`: `deepArticle` + `generateThreadUpdate` attach
     the snippets they already fetched via new pure `groundingSourcesFrom`
     (dedupe by URL, zero extra AI cost).
   - `app/lib/stories.ts`: pure `tavilyBronCount(items)` — distinct grounding
     URLs per rubriek.
   - `app/components/EditieWeergave.tsx`: `CijfersCard` renders the accent row
     (`var(--accent)`) only when count > 0.
   - `docs/brandbook.md` §7: recipe note un-gated.
   - **Gate green**, 8 new tests (5 `tavilyBronCount` + 3 `groundingSourcesFrom`).

## What's open

1. **Siem action — set `TAVILY_API_KEY`** in `.env.local` + Vercel. Until then
   `tavilyBronCount` is 0 everywhere and the row stays hidden (by design). Once
   set + a pipeline runs, grounded rubrieken show the extra-source count.
2. **Board seeding** — Siem picked "Something else" for the first substantial
   initiative (not in current docs); a `/prd` for it is starting next.
3. **Other Siem-queue items** (from the backlog investigation): localhost-review
   entity-typing F4 + apply its canonicalization script; triage MOR-1 (click
   text → references) and MOR-2 (storylines-as-card-grid — note MOR-2 likely
   conflicts with the shipped master–detail umbrella reader).

## Known issues / gotchas

- `.claude/settings.local.json` carries an uncommitted local diff (this
  session's permission grants) — deliberately kept out of commits; it is a
  per-contributor file.
- The "+N extra bronnen via Tavily" row cannot be verified by the gate (needs a
  live grounded pipeline) — it's Siem's morning-review live check.
- Pre-existing: `.next/types/… 2.*` duplicate files can appear on macOS/iCloud —
  `find .next -name "* 2.*" -delete` then re-run tsc.
