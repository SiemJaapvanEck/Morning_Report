# HANDOFF — Finance P5 (goals + ETA) built on its branch, awaiting review

> **Last updated:** 22 July 2026 — dispatched session, `MOR-8-goals-eta-2026-07-22`
> branch (off `origin/main`). Not yet merged.

## Where we stand

`main` has Wave 1 (finance + research foundations, migrations `0019` +
`0020` applied live) and Wave 2's finance UI (MOR-6 + MOR-7) + settings
shell (MOR-15). This session built **MOR-8 (Finance P5 — goals: investment
goal ETA + named savings goals)** on its own branch, gate green, not yet
merged to `main`.

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
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Build-cache hygiene: a file-sync tool has been cloning files with a `" 2"`
  suffix (e.g. stray `.next/**/* 2.ts`, `HANDOFF 2.md`); these pollute `tsc`.
  `rm -rf .next` before a gate if you see phantom duplicate-identifier
  errors.
