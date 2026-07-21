# HANDOFF — Finance Wave 2: MOR-6 + MOR-7 built, awaiting Siem's live review

> **Last updated:** 21 July 2026 (dispatched implementer session) — on branch
> `MOR-6-finance-ui-2026-07-21`, not yet merged.

## Where we stand

This branch builds the complete `/financien` page: MOR-6 (Phase 3 — holdings
& portfolio UI, the 3-line chart) and MOR-7 (Phase 4 — income/expense report
→ monthly surplus as the DCA driver), both to their acceptance criteria.
Gate green throughout (lint, tsc, vitest, build). **Both issues are
`needs-siem`** — this session did not merge; Siem live-verifies on
`localhost:3000` first.

Wave-1 foundation this branch builds on (already on `main`): migration
`0019_finance.sql` (holdings, holding_buys, incomes, expenses, finance_goals,
finance_settings — Siem has applied it), `app/lib/geld.ts`, and
`modules/finance`/`modules/markten`'s pure math + keyless Yahoo fetchers.

## What this session built

**MOR-6 (commit `d2cce64`):**
- `getPortfolio(profileId)` in `app/lib/queries.ts` — holdings + buys +
  finance_settings, one `PortfolioView`.
- `app/api/holdings/route.ts` + `app/api/holding-buys/route.ts` — cookie-
  gated, action-based (`create`/`update`/`delete`) POST endpoints, same
  shape as `app/api/feedback/route.ts`.
- `app/financien/page.tsx` — guard shape copied from `app/archive/page.tsx`,
  `force-dynamic`; server-fetches holdings/buys + live quotes/FX
  (`modules/markten`).
- `app/lib/financien.ts` (+ `financien.test.ts`, 10 tests) — pure
  `buildPortfolioChart`/`toSegments` helpers that align cost-basis history,
  the "today" value marker, and the forward projection onto one shared
  monthly x-axis, reusing `seriesPoints()` from `app/lib/stories.ts`.
- `app/components/FinancienChart.tsx` — the 3-line client SVG chart
  (`<polyline>` renderer, € axis via `geld.ts`); `FinancienPortfolio.tsx`
  (stat tiles + DCA-contribution override input + holdings list with
  inline edit/delete); `FinancienHoldingForm.tsx` + `FinancienBuyForm.tsx`
  (copy `CaptureFormulier.tsx`'s shape).
- `/financien` nav link in `app/layout.tsx`.
- `docs/brandbook.md` §6 "Financiën page (portfolio chart)" — new recipe;
  old §6/§7 renumbered to §7/§8.

**MOR-7 (commit `54e4124`):**
- `getCashflow(profileId)` in `app/lib/queries.ts` — incomes + expenses.
- `app/api/income/route.ts` + `app/api/expenses/route.ts` — same
  cookie-gated action-based shape.
- `modules/finance/index.ts`: `monthlyTotals`, `recurringMonthlyNet`,
  `projectRecurringForward` (+8 new tests in `finance.test.ts`) — recurring
  income/expenses project forward for the report; one-off entries don't.
- `app/components/FinancienCashflow.tsx` (report table: actual months +
  3 forward "verwacht" months) + `FinancienIncomeForm.tsx` +
  `FinancienExpenseForm.tsx` (starter categories in
  `app/lib/financien.ts`'s `EXPENSE_CATEGORIES`).
- Wired: `/financien`'s page now passes the current month's surplus (or
  `finance_settings.monthly_contribution_override` when set) as the P3
  chart's default DCA contribution — still overridable via the existing
  input.

**Gate:** lint clean, `tsc --noEmit` clean, vitest 412 passed (up from 380 on
main; +32 new), `next build` clean. Ran via `.claude/hooks/gate.sh` → GREEN.

## Modeling decision flagged for Siem (not literally in the PRD)

`costBasisSeries` (Phase 2, on main) takes an optional per-buy `fx_to_eur`
and treats a missing rate as 0 € — "never guess a missing rate" (PRD §5).
There is no historical-FX source anywhere in this system (Yahoo only gives
*live* rates; the PRD explicitly rules out historical backfill for V1). So
for a non-EUR buy, the page (`FinancienPortfolio.tsx`) passes **today's
live FX rate** (the same one used for portfolio valuation) as the cost-basis
conversion, rather than leaving it 0. This is the pragmatic reading of "V1 =
only live data, no history" — but it does mean an old USD buy's € cost basis
uses today's EUR/USD rate, not the rate on the actual purchase date. If a
holding's currency has no live rate available *at all* right now, it still
contributes 0 € and is flagged "wisselkoers onbekend" in the UI (true
missing-rate case, never guessed). **Please confirm this reading is
acceptable during live review** — the alternative (0 € cost basis for every
non-EUR buy) was rejected as clearly worse for a Siem holding real USD
stocks.

## What's open / next

1. **Siem — live-verify on `localhost:3000`:**
   - `/financien` — add a holding (e.g. `AAPL`/USD or a EUR ticker), add a
     buy, confirm the chart renders (amber cost-basis line → accent "today"
     dot → dashed amber projection), edit/delete a holding and a buy.
   - Add an income + an expense (mark one recurring), confirm the monthly
     report table renders and the DCA-contribution stat tile on the chart
     picks up the computed surplus by default (try the override input too).
   - Check the FX-flag modeling decision above against a real USD holding.
2. Once approved: `/merge` MOR-6 + MOR-7 (needs-siem, so Siem's explicit go
   first — see workflow.md).
3. **Not built here (later phases, still Backlog):** MOR-8 (goals — Phase 5,
   depends on MOR-6+MOR-7), MOR-9 (dashboard tiles — Phase 6).
4. Research (MOR-12/13/14) and Settings (MOR-15..18) Wave-2 issues are
   untouched by this branch — separate dispatch.

## Known issues / gotchas

- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first (done here).
- The FX-for-cost-basis modeling decision above is the one open judgment
  call from this session — flagged, not silently assumed.
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — unrelated to this branch, carried over from Wave 1.
