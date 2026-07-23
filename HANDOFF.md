# HANDOFF — MOR-9 rebuilt (local worktree, push-capable); MOR-8/12/16 in production

> **Last updated:** 23 July 2026 — dispatched session (orchestrator-triggered,
> local worktree `../Morning_Report-worktrees/MOR-9`, unattended). Checkout is
> on `MOR-9-finance-dashboard-tiles-2026-07-23`.

## Where we stand

**MOR-9 (Finance P6 — dashboard tiles + nav polish) is rebuilt to the
reviewed end-state from scratch.** The 22 Jul cloud session that originally
built it hit a hard 403 on push (its GitHub credentials were read-only) and
the commits were lost with the container — see its two Linear comments
(build record + reviewer fix list) for the full record of what was reviewed
and fixed. This session rebuilt from those comments as the spec, in a local
worktree with real push access.

**Built, gate green, pushed:**

- `modules/finance/index.ts` — added `etaLabel()` (moved from
  `FinancienGoals.tsx`, was a local unexported helper) and `rendementPct()`
  (extracted from an inline formula in `FinancienPortfolio.tsx`), both now
  the single shared implementation. Added the pure
  `summarizeFinanceDashboard()` aggregator: net worth (portfolio + savings),
  monthly surplus, investment-goal ETA, rendement % — composed from the
  existing `portfolioValueEur`/`costBasisSeries`/`monthlySurplus`/
  `etaMonthsToTarget`/`rendementPct` (no new math). Returns `null` when a
  profile has no finance data at all (CijfersCard-style empty state);
  `hasInvestmentGoal`/`hasCostBasis` flags gate the ETA and rendement
  readings individually so those two tiles can hide on their own. 17 new
  vitest cases (`modules/finance/finance.test.ts`), total suite now 449
  tests (was 433).
- `app/lib/financeDashboard.ts` (new) — the one impure step:
  `getFinanceDashboardSnapshot(profileId)` reads
  `getPortfolio`/`getCashflow`/`getGoals` + a live quotes/FX fetch
  (`modules/markten`), applies the same DCA-contribution default as
  `/financien`, and hands the raw rows to `summarizeFinanceDashboard()`.
- `app/components/FinanceDashboardTiles.tsx` (new) — the four cover-dashboard
  tiles (Netto waarde, Deze maand over, Beleggingsdoel ETA, Rendement %),
  each a `Link` to `/financien`, scheme tokens only (`--paper`/`--line`/
  `--ink`/`--muted`/`--accent`/`--emer-t`/`--rose`), same stat-tile recipe as
  the `/financien`/pipeline-rapport tiles.
- **Reviewed/locked fix folded in from the start:** the finance snapshot is
  only ever fetched/rendered when the viewed edition date is today.
  `app/page.tsx` (always today) fetches it unconditionally; `EditionScreen`/
  `EditionView` thread it through as `financeSnapshot`;
  `app/editie/[datum]/page.tsx` only calls `getFinanceDashboardSnapshot`
  when `datum === today`, passing `null` (row hidden, no fetch) for every
  historical date — a past date never silently shows today's net
  worth/surplus/ETA/rendement, and never triggers an unnecessary live Yahoo
  fetch on a past-date view.
- `app/layout.tsx` — header nav (border, wordmark, link text) moved off
  hardcoded `stone-*` Tailwind classes onto `--line`/`--ink`/`--muted`
  scheme tokens (the "nav polish" half of the issue title).
- `docs/brandbook.md` §5.2 — new recipe documenting the tile shape, row
  placement, the per-tile + whole-row empty-state rules, the today-only
  fetch/render rule, and the shared `etaLabel`/`rendementPct` helpers.

**Gate: green** — lint, `tsc --noEmit`, vitest (449 tests), `next build` all
pass, re-verified on the final commit.

**Four commits on `MOR-9-finance-dashboard-tiles-2026-07-23`** (pushed):
`856aab4` shared finance helpers + pure aggregator, `7807ddd` call-site
adoption + impure fetch wrapper, `1fd70c6` cover-dashboard tiles + today-only
gating, `d0d0059` nav polish + brandbook recipe.

## What's next

- Label is `needs-siem` — per the merge policy, this waits for Siem's
  explicit go before landing on `staging`, same as the original dispatch.
  A PR is open referencing MOR-9; the orchestrator/reviewer takes it from
  here (do not merge from this session).
- Visual check once on staging/preview: the tile row's placement (below the
  hero/weather/agenda/markten bento grid, above "Sol's selectie") and that
  the ETA/rendement tiles correctly hide for a profile with no investment
  goal / no buys yet.
- Environment note carried forward from the 22 Jul session: if any future
  **cloud/routine** session hits the same read-only-GitHub-credentials 403,
  the fix is environment/connector permissions (needs at least Contents:
  write), not a retry — this session confirms local worktrees with real
  push access are the reliable path meanwhile.

## Known issues / gotchas

- **Finance FX (live-review item, pre-existing):** non-EUR cost-basis
  conversion uses *today's* FX rate; a non-EUR buy without a rate
  contributes €0. Unchanged by this issue.
- MOR-16's pipeline-report numbers still need a check against a real edition
  (was down; fixed 22 Jul, should have real rows now — orchestrator to
  verify).
- `seedResearchThread` anchors on `entities[0]` with no umbrella preference —
  watch weak first entities.
- `.claude/ntfy-topic.txt` is **gitignored on purpose** (public repo) —
  local checkout only.
- `.claude/settings.local.json` carries an uncommitted local diff — kept out
  of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Fresh worktrees/clones have no `node_modules` — `npm install` first.
- Build-cache hygiene: `rm -rf .next` before a gate on phantom
  duplicate-identifier errors (file-sync tool clones files with a `" 2"`
  suffix).
