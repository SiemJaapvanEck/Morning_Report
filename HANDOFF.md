# HANDOFF — Wave 1 landed (Finance + Research foundations on main)

> **Last updated:** 21 July 2026 (interactive session with Siem) — on `main`

## Where we stand

Wave 1 of the three-initiative plan is fully merged. Both dispatched sessions
built their two `auto-ok` phases, both reviewer-approved, both double-gate green,
both landed on `main`.

## On main now (Wave 1)

- **Finance foundation** (MOR-4 + MOR-5): `supabase/migrations/0019_finance.sql`
  (6 tables — holdings, holding_buys, incomes, expenses, finance_goals,
  finance_settings; **file only, Siem applies**); `app/lib/geld.ts` (€/%
  formatters); `modules/finance/index.ts` (costBasisSeries, quantityAsOf,
  portfolioValueEur, monthlySurplus, projectCompound, etaMonthsToTarget);
  `modules/markten` extended with keyless Yahoo `fetchQuotes`/`fetchFxToEur`.
- **Research foundation** (MOR-10 + MOR-11):
  `supabase/migrations/0020_user_research.sql` (**file only, Siem applies**);
  `modules/research/index.ts` extraction core (`buildExtractionPrompt`,
  `parseExtraction`, defensive scan-tier `extractResearch`).
- Types for both in `modules/shared/types.ts`.

## What's open / next

1. **Siem — apply migrations `0019` + `0020`** to the live DB. Needed before any
   Wave-2 `needs-siem` surface phase can be live-verified.
2. **Wave 2 (needs-siem), still Backlog** — dispatch after migrations applied +
   Siem in the loop for visual review:
   - Finance: MOR-6 (holdings UI + 3-line chart), MOR-7 (income/expense report),
     MOR-8 (goals), MOR-9 (dashboard tiles).
   - Research: MOR-12 (seed & track → followed thread), MOR-13 (MijnOnderzoek
     component), MOR-14 (surface in report).
   - Settings: MOR-15 (tab shell — unblocked, ready), MOR-16 (pipeline report),
     MOR-17 (Financiën tab ← MOR-8), MOR-18 (Account tab ← MOR-13).
3. **Merged-branch cleanup**: worktrees `../Morning_Report-worktrees/MOR-4` and
   `/MOR-10` + their branches can be removed (both landed).

## Known issues / gotchas

- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Finance FX: per-buy `fx_to_eur` is caller-supplied (no historical-FX lookup in
  the pure module); a non-EUR buy with no rate contributes 0 € (never guessed) —
  a settled, reviewer-approved reading of the PRD.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
