# HANDOFF — MOR-16 (Pipeline-rapport tab) built, gate green, awaiting review

> **Last updated:** 22 July 2026 — dispatched session, branch
> `MOR-16-pipeline-rapport-tab-2026-07-22`. Not merged.

## Where we stand

Wave 2 surfaces continue landing on `main`: **finance UI (MOR-6/MOR-7)** and
the **settings tab shell (MOR-15)** are merged. This session built **MOR-16
(Settings P2 — Pipeline-rapport tab)** on its own branch — gate green, PR
open, `needs-siem` (visual review + live data are Siem's).

## This session (MOR-16)

Mounted the Pipeline-rapport tab into the MOR-15 settings shell's `pipeline`
panel prop — **no shell change**, per the locked PRD decision.

- **`modules/pipeline-report/index.ts`** (+ `pipeline-report.test.ts`, 11
  tests): pure aggregation core, no Supabase/React.
  - `computeTodayReport(items, steps, usage)` → article count by category
    (busiest first), distinct source count, total € cost, Sol article count
    (`sol_note != null`), deep-research count (`band === "deep"` **and** a
    non-null article), and per-kind step duration (average
    `finished_at − started_at` in seconds; unfinished runs excluded from the
    average, reported as `avgSeconds: null` when a kind never finished).
  - `computePipelineTrends(editions, usage, items)` → per-edition € cost +
    article count, sorted ascending by date, sliced to the last 7 and last
    30 editions.
- **`getPipelineReport(profileId)`** in `app/lib/queries.ts`: reads the last
  30 editions for the profile (bounds the scan per the PRD's rail), finds
  today's edition, joins its `edition_items` to `items(category_id,
  source_id, categories(slug, name))` plus its `pipeline_steps` and
  `usage_log`, flattens the joins into the aggregator's row shapes, and also
  pulls `usage_log`/`edition_items` for every edition in the 30-edition
  window (scoped via `edition_id in (...)`) for the trend series. Read-only,
  no AI calls — every table already existed.
- **`InstellingenPipelineTab`** (`app/components/InstellingenPipelineTab.tsx`):
  server-rendered (no `"use client"` — no interactivity). Today's 5 stat
  tiles (kosten/artikelen/bronnen/Sol-artikelen/deep-research, `--faint` when
  today's edition hasn't run), a category-breakdown bar list
  (`categoryColor()` per bar), a per-kind step-duration list (Dutch labels),
  and two `TrendCard`s (kosten, artikelen) each holding a 7-day and 30-day
  sparkline built with `seriesPoints()` — the same helper the krant umbrella
  chart uses (`app/lib/stories.ts`), reused as the PRD specified.
- **`docs/brandbook.md` §7** "Pipeline-rapport tab" added (stat-tile row,
  category bars, step-duration list, `TrendCard` sparkline recipe); old
  §7-9 (Interaction & motion / Do's & don'ts / Change log) renumbered to
  §8-10, and the one stale in-doc `§7` cross-reference (the "komt binnenkort"
  empty-state note) updated to `§9`.
- Gate green: lint, `tsc --noEmit`, **423 tests** (+11 new), `next build`.

## What's open / next

- **MOR-16 itself:** `needs-siem` — visual review of the tab (tile layout,
  bar/sparkline rendering with real data) and a check against a live
  `usage_log`/`pipeline_steps` edition once the pipeline has run today.
- **Wave-2 remaining** (all Backlog, `needs-siem` unless noted):
  - Finance: MOR-8 (goals + ETA), MOR-9 (dashboard tiles).
  - Research: MOR-12 (seed & track → thread), MOR-13 (MijnOnderzoek
    component), MOR-14 (surface in report).
  - Settings convergence: MOR-17 (Financiën tab ← MOR-8), MOR-18 (Account
    tab ← MOR-13) — both still blocked on their finance/research sources.

## Known issues / gotchas

- **Live-review-only claims:** the tab has never rendered against a real
  `pipeline_steps`/`usage_log`/`edition_items` row set — the aggregation
  logic is unit-tested over hand-built fixtures, but Siem should sanity-check
  the numbers against an actual edition (especially step-duration timing,
  since `pipeline_steps.attempts` retries aren't specially handled — a
  retried step just contributes another duration sample to its kind's
  average).
- Today's stat tiles fetch on every `/instellingen` page load regardless of
  which tab is active (matches the existing Account-tab data-fetching
  pattern — the shell mounts all three tabs' data server-side, tab switching
  is client-only). No new AI calls; the added queries are a handful of
  `select`s bounded to ≤30 editions.
- **Finance FX (live-review item, unrelated to this session):** for non-EUR
  holdings, historical cost-basis conversion defaults to *today's* live FX
  rate, not the buy-date rate. Watch real non-EUR positions.
- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
- Build-cache hygiene: a file-sync tool has been cloning files with a `" 2"`
  suffix (e.g. stray `.next/**/* 2.ts`, `HANDOFF 2.md`); these pollute `tsc`.
  `rm -rf .next` before a gate if you see phantom duplicate-identifier errors.
