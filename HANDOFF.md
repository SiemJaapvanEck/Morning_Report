# HANDOFF — Finance UI landed on main; Settings shell next

> **Last updated:** 22 July 2026 — merged `MOR-6-finance-ui-2026-07-21` → main
> (interactive session with Siem, /merge). On `main`.

## Where we stand

Wave 1 (finance + research foundations) is on `main`, migrations `0019` +
`0020` are applied to the live DB. Wave 2 surfaces are now landing: the
**finance UI (MOR-6 + MOR-7) just merged to main** — reviewer-approved,
double-gate green. The **settings shell (MOR-15)** is reviewer-approved and
queued to merge next in this same session.

## On main now (finance UI — MOR-6 + MOR-7)

- `/financien` page: 3-line portfolio chart (cost basis / current value /
  compound projection), holdings + buys management (inline edit/delete),
  income/expense forms + monthly report with forward "verwacht" months.
- `getPortfolio` / `getCashflow` in `app/lib/queries.ts`; cookie-gated write
  routes `app/api/{holdings,holding-buys,income,expenses}/route.ts`.
- Pure helpers: `app/lib/financien.ts` (chart building) +
  `modules/finance` monthly/surplus math (all unit-tested).
- Current-month surplus feeds the chart's DCA default (overridable).
- `/financien` nav link in `app/layout.tsx`; brandbook §6 recipe added.

## What's open / next

1. **Merge MOR-15 (settings shell)** — reviewer-approved, CI green, queued
   in this session (double gate → land → close).
2. **Wave-2 remaining, still Backlog (`needs-siem`):**
   - Finance: MOR-8 (goals + ETA), MOR-9 (dashboard tiles).
   - Research: MOR-12 (seed & track → thread), MOR-13 (MijnOnderzoek
     component), MOR-14 (surface in report).
   - Settings convergence: MOR-16 (pipeline-rapport tab), MOR-17 (Financiën
     tab ← MOR-8), MOR-18 (Account tab ← MOR-13).
3. **Merged-branch cleanup:** worktrees for MOR-4/MOR-10 (landed Wave 1) and
   MOR-6 (just landed) can be removed with their branches.

## Known issues / gotchas

- **Finance FX (live-review item):** for non-EUR holdings, historical
  cost-basis conversion defaults to *today's* live FX rate, not the buy-date
  rate. Surfaced honestly by the implementer; watch the numbers on real
  non-EUR positions. Per-buy `fx_to_eur` is caller-supplied; a non-EUR buy
  with no rate contributes 0 € (never guessed).
- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
