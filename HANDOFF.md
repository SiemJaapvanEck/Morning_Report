# HANDOFF — MOR-4 + MOR-5 (Finance foundation + math core) built, gate green

> **Last updated:** 21 July 2026 (dispatched implementer session) — on branch
> `MOR-4-finance-foundation-2026-07-21`

## Where we stand

This branch built the first two phases of the Personal Finance PRD
(`docs/prd/finance.md`) end to end, both `auto-ok`:

- **MOR-4 — Finance P1 (foundation):** the whole finance data model as one
  migration file, mirrored TypeScript types, and a Dutch money/percent
  helper. No UI, no queries, no live DB touched.
- **MOR-5 — Finance P2 (math core):** every pure finance calculation the
  later UI phases need, plus the keyless Yahoo quote/FX fetchers.

Commits on this branch (top of `git log`):

1. `970c58f` — MOR-4: schema + types + money helper
2. `6df20b7` — MOR-5: math core + Yahoo quotes/FX

Gate green after both commits: `npm run lint && npx tsc --noEmit && npm test
&& npm run build` — 380 vitest cases pass (42 new: 15 in `geld.test.ts`, 27
in `finance.test.ts`), build succeeds, lint/tsc clean.

## What this session did (and why)

**MOR-4:**
- `supabase/migrations/0019_finance.sql` — six profile-scoped tables:
  `holdings`, `holding_buys`, `incomes`, `expenses`, `finance_goals`,
  `finance_settings`. Each has RLS enabled with no policies (per `0003`'s
  convention — service-role-only access). Format mirrors `0017_entities.sql`
  (header comment explaining the model, one `create table` block per table,
  index where a query path needs one, `alter table ... enable row level
  security` right after). **File only — not applied.** The legacy
  `portfolio_instruments` table (from `0001_init.sql`) is untouched, per the
  PRD's locked decision (superseded, not migrated/dropped).
- `modules/shared/types.ts` — added `Holding`, `HoldingBuy`, `Income`,
  `Expense`, `FinanceGoal`, `FinanceSettings` interfaces mirroring the
  migration 1:1, plus `FinanceQuote` (`{price, currency}`) for Phase 2's live
  quotes (never persisted).
- `app/lib/geld.ts` + `geld.test.ts` — `formatEuro` (Dutch `Intl` currency
  formatting), `formatPct` (fixed-decimal Dutch percent), `parseAmount`
  (Dutch-comma string → number, `null` on unparseable input, never throws).
  Note: `Intl.NumberFormat('nl-NL', {style:'currency', ...})` in this Node/V8
  puts a **non-breaking space** (U+00A0) between the € sign and the number,
  and formats negatives as `€ -42,10` rather than `-€ 42,10` — the tests
  assert the actual runtime output, not an assumption about the format.

**MOR-5:**
- `modules/finance/index.ts` (pure — only imports types from `../shared`):
  - `costBasisSeries(buys)` — cumulative € invested, one step-series point
    per distinct buy date. Takes a `CostBasisBuy[]` (mirrors `HoldingBuy` +
    an optional `fx_to_eur` the caller supplies per buy for non-EUR
    currencies — there's no historical-FX lookup in this module, matching
    the PRD's "no historical backfill" non-goal). A non-EUR buy with no
    `fx_to_eur` contributes 0€ for its price (fee still counts) — never a
    guessed rate.
  - `quantityAsOf(buys, date)` — total quantity bought on/before an ISO
    date (no sells modeled anywhere in this PRD).
  - `portfolioValueEur(holdings, buys, quotes, fx)` — today's total € value;
    a holding with no matching quote or no FX rate for its currency
    contributes 0€ (flagging is a UI concern for a later phase).
  - `monthlySurplus(incomes, expenses, month)` — € income − € expenses for
    a `"YYYY-MM"` month string. Recurring-forward projection is Phase 4
    scope, not implemented here.
  - `projectCompound(startValueEur, monthlyContributionEur,
    annualReturnPct, months)` — forward series under **monthly**
    compounding (`(1+annual/100)^(1/12) - 1`), contribution added after each
    month's growth. `series[0]` is the start value.
  - `etaMonthsToTarget(...)` — first month index the projection reaches
    `targetEur`; `0` if already met; `null` if unreached within the
    600-month cap (`ETA_MONTH_CAP` exported).
- `modules/markten/index.ts` — extracted the existing `fetchOne`'s raw fetch
  into a shared `fetchYahooMeta(symbol)` helper (same behavior, now reused),
  then added:
  - `fetchQuotes(symbols)` → `Record<symbol, FinanceQuote>`, skips any
    symbol that fails to resolve.
  - `fetchFxToEur(currencies)` → `Record<currency, rate>` (rate converts 1
    unit of that currency to EUR). `EUR` short-circuits to `1` without a
    fetch; `USD` uses `EURUSD=X` inverted; every other currency uses
    `<CUR>EUR=X` directly (locked decision). Missing rates are simply absent
    from the result.
  - Both follow the exact `fetchMarkten` contract: **never throw**, degrade
    to empty, `MAX_PARALLEL`/`TIMEOUT_MS` concurrency cap reused.
- `modules/finance/finance.test.ts` — 27 cases: every pure function
  (including FX-conversion math, a missing-quote path, a missing-FX-rate
  path, and `projectCompound`/`etaMonthsToTarget` checked against
  hand-computed values) plus 7 cases mocking `globalThis.fetch` to prove
  `fetchQuotes`/`fetchFxToEur` never throw and shape/degrade correctly.

No AI calls, no new npm dependency, no live DB/network access from this
session — all per the PRD's rails.

## What's open / next

1. **Siem applies `supabase/migrations/0019_finance.sql`** (this session
   authored the file only, per project rule — no live DB in an unattended
   session) and live-verifies.
2. **MOR-6 through MOR-9** (Phases 3–5: holdings/portfolio UI, income/expense
   report, goals) are **`needs-siem`** — they need the live DB + live Yahoo
   fetch + visual review, and were **not started** in this session (out of
   scope per the dispatch instructions: stop after MOR-5).
3. Reviewer should check the PR against both issues' acceptance criteria
   before `/merge`; after merge, rebase/re-gate MOR-10's parallel branch if
   it's still open (per the orchestrator's Wave 1 dispatch).

## Known issues / gotchas

- `npm install` had to be run fresh in this worktree (`node_modules` wasn't
  present) — that's a one-time worktree-setup cost, not a project issue.
- `costBasisSeries`'s buy-time FX design (`fx_to_eur` passed in per buy,
  optional, ignored for EUR) is this session's reading of the PRD's
  slightly compressed acceptance-criteria line ("each buy converted to €
  using its own price_native×quantity+fee_eur and the buy-time FX passed
  in"). It's consistent with the PRD's non-goal of no historical-price
  backfill and the FX-correctness rail (missing rate → 0€, never guessed).
  Flag for reviewer: if Siem intended something different (e.g. FX resolved
  from a historical-rate table), that would be a PRD amendment, not a bug
  in this implementation.
- Pre-existing gotcha (unrelated to this session):
  `.next/types/… 2.*` duplicate files can appear on macOS/iCloud checkouts →
  `find .next -name "* 2.*" -delete` then re-run tsc if that ever surfaces.
