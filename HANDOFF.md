# HANDOFF — staging: Wave-2 review-queue features landing

> **Last updated:** 22 July 2026 — orchestrator session landing the review
> queue (MOR-8 / MOR-12 / MOR-16) onto `staging` per the new merge policy.
> On `staging`.

## Where we stand

The **agent-team workflow is enrolled and now committed**: Bet & Flow
planning, the plugin specialist team, the staging merge policy, and the
`docs/ops/` memory files (bets, status-log, decisions-pending, learnings —
read all four at session start). The `staging` branch exists on GitHub at
parity with `main`; the enrollment's follow-up items in
`docs/ops/decisions-pending.md` are cleared — only Siem-decisions remain
there. `.claude/ntfy-topic.txt` is **gitignored on purpose** —
the repo is public and the topic name is the channel's only access control;
it lives only in the local checkout.

Wave 1 (finance + research foundations) is on `main`; migrations `0019` +
`0020` are applied to the live DB. Wave 2 surfaces are landed on `main`: the
**finance UI (MOR-6 + MOR-7)** and the **settings tab shell (MOR-15)** —
all reviewer-approved, all double-gate green. The agent-team workflow is
enrolled and committed. This session lands the review queue — **MOR-8
(finance goals + ETA)**, **MOR-12 (research seed & track)**, **MOR-16
(pipeline-rapport tab)** — onto `staging` for Siem's review; MOR-8 detail
below.

## This session (MOR-8)

Built to the PRD Phase 5 spec (`docs/prd/finance.md`) on top of the already-
applied `finance_goals` + `finance_settings` tables (migration `0019`,
Phase 1) — **no new migration needed**:

- **`goalProgressPct(currentEur, targetEur)`** (`modules/finance/index.ts`):
  new pure helper — percentage of target reached, clamped `[0, 100]`,
  `target <= 0` reads as 0 (never a divide-by-zero/guess). Unit tested
  alongside the existing `etaMonthsToTarget` (already built in Phase 2,
  reused here unchanged).
- **`getGoals(profileId)`** (`app/lib/queries.ts`): reads `finance_goals`,
  splits into the one `investment` goal (locked decision: at most one) and
  the `savings` goals array.
- **`app/api/goals/route.ts`**: cookie-gated, action-based POST
  (create/update/delete), same shape as `app/api/feedback/route.ts`.
  Server-enforces "exactly one investment goal" — a second `create` with
  `kind: "investment"` gets a 409 (edit the existing one instead).
- **`app/api/finance-settings/route.ts`**: cookie-gated upsert (table has
  `unique(profile_id)`) for `expected_return_pct` only —
  `monthly_contribution_override` stays the Settings Financiën tab's seam
  (MOR-17), untouched here.
- **`FinancienGoals`** (`app/components/FinancienGoals.tsx`): investment-
  goal card (progress bar, `€ huidig / € doel · pct`, bold ETA line —
  `"~N jaar M mnd"`, `"doel al bereikt"` at 0, `"buiten bereik"` past the
  600-month cap) + create form when none exists yet; N savings-goal rows
  (name, target, manually-updatable `saved_eur`, progress bar, delete) +
  create form; an expected-return control (small input + Opslaan) that
  writes `finance_settings` and calls `router.refresh()` so the Phase-3
  chart's projection picks up the new figure too.
- Wired into `/financien` (`app/financien/page.tsx`): fetches `getGoals()`
  alongside the existing portfolio/cashflow reads; computes
  `portfolioValueEur(holdings, buys, quotes, fx)` once, server-side, and
  passes it down — the Goals section needs no quotes/FX wiring of its own.
- **Brandbook §6** recipe added: the progress-bar track, goal cards, and
  the return control (+ change-log entry, 22 July 2026).

**Gate:** green — lint clean, `tsc --noEmit` clean, 418/418 vitest passing
(6 new `goalProgressPct` cases), `next build` compiles all routes including
the two new API routes.

**Commits** (`MOR-8-goals-eta-2026-07-22`):
- `e654ed5` — `goalProgressPct` pure helper + tests
- `551d899` — `getGoals` query + `goals`/`finance-settings` write endpoints
- `d27f8e0` — goals UI (investment ETA card, savings rows, return control) + page wiring + brandbook

## What's open / next

- **This branch needs review + `needs-siem` live verification** (label on
  the issue): applying no new migration (none needed), but exercising the
  live create/update/delete flows, the "second investment goal → 409"
  path, and visual review of the progress bars + ETA text on `/financien`.
- Wave-2 remaining after this: MOR-9 (dashboard tiles — depends on MOR-8 +
  others), MOR-12/13/14 (research), MOR-16/17/18 (settings convergence —
  **MOR-17 mounts this session's `FinancienGoals`/settings surface into the
  Settings Financiën tab** once MOR-8 lands).

## Known issues / gotchas

- **Finance FX (carried over, live-review item):** non-EUR cost-basis
  conversion still defaults to *today's* live FX rate, not the buy-date
  rate (Phase 3 finding, reviewer-approved reading — unchanged this
  session).
- The expected-return control's `router.refresh()` re-fetches the server
  page so the Phase-3 chart's projection stays consistent with a saved
  `expected_return_pct`, but the two components don't share client state
  directly — a save always goes through a full server round-trip, by
  design (no new client-state plumbing added for this phase).
- `.claude/settings.local.json` may carry an uncommitted local diff
  (session permission grants) — kept out of commits (per-contributor
  file).

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
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.

## This session (MOR-12)

- **`modules/research/index.ts`** gained a DB-helpers section (Phase 2's pure
  extraction is untouched above it):
  - `createResearch({ profileId, title, body })` — the full create path:
    `extractResearch` → resolve `category_id` from the extracted slug →
    insert `user_research` → `seedResearchThread`. Returns the note with its
    `thread_id`/`status` set.
  - `seedResearchThread(...)` — opens a thread via `modules/threads`'
    `insertThread` (reused wholesale, **no parallel matcher**), anchored on
    the first extracted entity, `title` = the research note's own title
    (locked decision — not the AI `topicLabel`), `entities` = extracted,
    `status: "active"`; upserts a `follow_marks` row (`target_type: "thread"`,
    `active: true`); writes `user_research.thread_id` + `status: "gevolgd"`.
  - `isResearchOriginThread(threadId)` — the sole "is this a research thread"
    signal, a read of `user_research.thread_id` (no `threads`-schema change,
    per the locked decision). Used only for framing (below), never matching.
- **`app/api/research/route.ts`** (new file) — `POST` create path only,
  cookie-gated (401 without `mr_profile`), same pattern as
  `app/api/holdings/route.ts`. `GET`/`PATCH`/`DELETE` are Phase 4
  (MijnOnderzoek, MOR-13) — not built here.
- **`modules/generate/index.ts`** — `researchOriginFraming(isResearchOrigin,
  isFirstUpdate)`, a pure helper mirroring `storylineFraming`: when a thread
  originated from research (`isResearchOrigin`) AND this is its first update
  (`thread.state == null` — the same signal the prompt already uses for "new
  story"), it prepends a one-line frame so the update opens with a reference
  to the reader's own research ("sinds jouw onderzoek…") instead of a cold
  restart. `""` in every other case, including every update after the first.
  Wired into `generateThreadUpdate`'s prompt assembly. Unit-tested
  (`generate.test.ts`, 4 new cases).
- **`modules/pipeline/steps.ts`** — the one hook: `generateStep` now calls
  `isResearchOriginThread(job.threadId)` before `generateThreadUpdate` and
  passes it through as `researchOrigin`. `threadsStep` (matching) is
  **completely untouched** — a research thread is matched exactly like any
  other followed thread, per the PRD's locked decision.
- Gate green: lint clean, `tsc --noEmit` clean, **416/416 tests pass** (+4
  new for `researchOriginFraming`), `next build` compiles
  `/api/research` alongside the existing routes.
- Two commits: `a57fc0f` (seed + create API), `408517a` (framing + pipeline
  hook).

## What's open / next

- **Live verification (Siem, `needs-siem`)**: this issue's acceptance
  criteria require a real `askAI` call, real DB writes, and a live pipeline
  run to confirm — (1) POSTing a research note actually opens a thread +
  `follow_marks` row and links back onto `user_research`; (2) that thread
  participates in a real `threadsStep` run (entity overlap) and picks up a
  `generateThreadUpdate`; (3) its first update in the krant/archive genuinely
  reads with the "sinds jouw onderzoek" opening. None of this is
  gate-checkable — no live DB, no paid pipeline in this session (rails).
- **MOR-13** — "Mijn onderzoek" management component + API (`GET`/`PATCH`/
  `DELETE` on `app/api/research/route.ts`, `app/components/MijnOnderzoek.tsx`,
  `getResearch` in `app/lib/queries.ts`). Parallelizable with this phase;
  now unblocked to build against the same `createResearch` path.
- **MOR-14** — surface research-origin storylines in the report/archive
  ("Uit jouw onderzoek" label). Depends on this phase; unblocked now.
- Other Wave-2 backlog unchanged: **MOR-8/MOR-9** (finance goals + dashboard
  tiles), **MOR-16/17/18** (settings-shell convergence for
  pipeline-rapport/financiën/account tabs).

## Known issues / gotchas

- `seedResearchThread` anchors on `entities[0]` (extraction/scan salience
  order) with no registry-aware umbrella preference (unlike
  `modules/threads`' `primaryEntity`) — a deliberate simplification per the
  issue's "no new matching code" rail; if a research note's first entity is
  a weak anchor, its thread may match less news than expected. Not a bug,
  but worth watching in live review (the PRD's own risk note: "a research
  note with no matches simply shows no updates yet — no error").
- If `extractResearch` degrades to an empty extraction (AI failure), the
  seeded thread has `anchor_entity: null` and empty `entities` — it still
  gets created and followed, but can't match anything until curated. Also
  expected/by-design, not a bug.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Build-cache hygiene: a file-sync tool has been cloning files with a `" 2"`
  suffix (e.g. stray `.next/**/* 2.ts`, `HANDOFF 2.md`); these pollute `tsc`.
  `rm -rf .next` before a gate if you see phantom duplicate-identifier
  errors.
