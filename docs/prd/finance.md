# PRD — Personal Finance module (portfolio, DCA projection, income/expenses, goals)

> **Status:** approved (2026-07-21) · **Owner:** Siem · **Linear:** Morning Report project · "Finance ·" sprint milestones
> **Linear issues:** P1 MOR-4 · P2 MOR-5 · P3 MOR-6 · P4 MOR-7 · P5 MOR-8 · P6 MOR-9
> A PRD is approved only when no open question could stall an autonomous
> session. Approved PRDs are the autonomy boundary: inside it agents proceed,
> outside it they ask.

## 1. Goal

A private, single-user personal-finance section in the Morning Report that
turns one coherent loop into a living picture of Siem's money:

**earning/expense report → monthly surplus → DCA contribution ("buy as much
stock as I can each month") → compounded at an expected return → investment
goal (with an ETA)**, alongside **named savings goals** (vacation, new PC).

Concretely, "done" end-to-end:

- A new **`/financien`** page (private, RLS-scoped to the profile) plus a few
  **dashboard tiles** on the cover linking to it.
- **Holdings** entered manually (symbol + buys); valued **live and for free**
  via the existing keyless Yahoo Finance endpoint, **multi-currency
  auto-converted to €** (USD→EUR via `EURUSD=X`).
- A **portfolio chart** with three series: (1) **cost basis** — cumulative €
  invested over time; (2) **current value** — today's live portfolio value;
  (3) **expected compound projection** forward from today, driven by the
  monthly DCA contribution and a user-set expected annual return.
- An **income/expense report**: manual income + categorized expenses →
  **monthly surplus**, which is the DCA contribution feeding the projection.
- **Goals:** an **investment goal** (target € portfolio value, with an ETA
  derived from the projection) and **named savings goals** (target + saved-so-
  far + progress).

All in Dutch UI copy, € as the display currency, no login (cookie profile),
**no new npm dependency and no paid/keyed external API** (Yahoo is keyless).

## 2. Non-goals

- **No live broker/bank account-linking.** DEGIRO has no official retail API;
  paid aggregators (Tink/GoCardless) are out of scope. Holdings are entered by
  hand. (Auto-import stays a possible future initiative, not in this PRD.)
- **No DEGIRO CSV import in this PRD.** Parked as a separate, low-priority
  Linear task ("DEGIRO CSV importer") — parsers are format-specific and need a
  sample export to spec.
- **No tax, dividend-accounting, or multi-account reconciliation.** (A
  `calendar_events` dividend tie-in may come later; not here.)
- **No trading, order placement, or price alerts.**
- **No sharing/export of financial data.** This section is never part of the
  shareable news report; it stays behind the profile cookie.
- **No historical-price backfill of the current-value line for V1** — the
  current-value series is anchored at today (see Phase 3 locked decision); a
  full historical market-value line is a possible later enhancement.

## 3. Verification reality

- **Gate-checkable (auto-ok):** all pure finance math (cost basis, quantity-as-
  of-date, portfolio valuation, FX conversion, compound projection, goal ETA,
  monthly surplus), the money-formatting helper, and the migration **file** —
  covered by vitest + lint + tsc + build. The Yahoo quote/FX fetchers are thin
  defensive wrappers (never throw, degrade to empty) like `modules/tavily` /
  `modules/markten`, unit-tested on their pure shaping.
- **Needs Siem (live):** applying migration `0019`; any form→Supabase write and
  DB read actually running; live Yahoo quotes/FX; and visual review of the
  `/financien` page + dashboard tiles. Phases whose acceptance requires a live
  DB, a live fetch, or visual sign-off are labelled **needs-siem**.
- Standing project rule: agents author migration **files** only — **Siem
  applies `0019`** and live-verifies in the morning review.

## 4. Phases (one phase = one Linear issue = one session)

### Phase 1 — Foundation: schema + types + money helper
- **Goal:** the whole finance data model as one migration file, mirrored types,
  and a Dutch money/percent formatter. No UI, no queries.
- **Acceptance criteria:**
  - `supabase/migrations/0019_finance.sql` authored (format per `0018`): a
    `--` header explaining the model, then the tables below, each with
    `profile_id uuid not null references profiles(id) on delete cascade`,
    `created_at timestamptz not null default now()`, and
    `alter table public.<name> enable row level security;` (no policies, per
    `0003`):
    - `holdings` — `id`, `profile_id`, `symbol text` (Yahoo ticker),
      `name text`, `kind text check (kind in ('aandeel','etf','crypto','overig'))`,
      `currency text not null` (native, e.g. 'USD'/'EUR'), `unique (profile_id, symbol)`.
    - `holding_buys` — `id`, `profile_id`, `holding_id uuid not null references holdings(id) on delete cascade`,
      `bought_on date not null`, `quantity numeric not null`,
      `price_native numeric not null`, `currency text not null`,
      `fee_eur numeric not null default 0`.
    - `incomes` — `id`, `profile_id`, `received_on date not null`,
      `label text`, `amount_eur numeric not null`,
      `recurring boolean not null default false`.
    - `expenses` — `id`, `profile_id`, `spent_on date not null`,
      `category text not null`, `label text`, `amount_eur numeric not null`,
      `recurring boolean not null default false`.
    - `finance_goals` — `id`, `profile_id`,
      `kind text check (kind in ('investment','savings'))`, `name text not null`,
      `target_eur numeric not null`, `target_date date`,
      `saved_eur numeric not null default 0` (savings only; investment reads
      live portfolio value).
    - `finance_settings` — `id`, `profile_id`, `unique (profile_id)`,
      `expected_return_pct numeric not null default 7`,
      `monthly_contribution_override numeric` (nullable; when set, overrides the
      auto surplus-driven DCA amount — edited from the Settings Financiën tab,
      PRD #3), `base_currency text not null default 'EUR'`,
      `updated_at timestamptz not null default now()`.
  - Matching interfaces added to `modules/shared/types.ts` (`Holding`,
    `HoldingBuy`, `Income`, `Expense`, `FinanceGoal`, `FinanceSettings`).
  - `app/lib/geld.ts` — pure `formatEuro(n)` (`Intl.NumberFormat('nl-NL',
    {style:'currency',currency:'EUR'})`) + `formatPct(n)` + `parseAmount(str)`
    (Dutch decimal comma → number), with `app/lib/geld.test.ts`.
  - Gate green.
- **Files/areas:** `supabase/migrations/0019_finance.sql`,
  `modules/shared/types.ts`, `app/lib/geld.ts` (+ test).
- **Locked decisions:** amounts of money in EUR are stored as `numeric`;
  holdings priced in native `currency`, buys record `price_native` +
  `currency` + `fee_eur`. The legacy unused `portfolio_instruments` table is
  **left untouched** (superseded by `holdings`; do not migrate or drop it).
  One migration for all finance tables (so Siem applies once). Expected return
  default **7%**. `base_currency` is EUR (the FX target).
- **Depends on:** —
- **Label:** auto-ok · *(Siem applies `0019` before later phases are live-verified.)*

### Phase 2 — Finance math core + free Yahoo quotes/FX
- **Goal:** all pure finance logic + the keyless price/FX fetchers, fully unit-
  tested. No UI, no DB writes.
- **Acceptance criteria:**
  - `modules/finance/index.ts` (pure; may import `modules/shared/db`/`unwrap`
    for later query helpers but the math functions take plain data):
    - `costBasisSeries(buys)` → cumulative € invested over time (step series;
      each buy converted to € using its own `price_native`×`quantity`+`fee_eur`
      and the buy-time FX passed in / EUR buys unchanged).
    - `quantityAsOf(buys, date)` and `portfolioValueEur(holdings, buys, quotes, fx)`
      → today's € value (native price × quantity → € via `fx`).
    - `monthlySurplus(incomes, expenses, month)` → € income − € expenses.
    - `projectCompound(startValueEur, monthlyContributionEur, annualReturnPct, months)`
      → forward € series, **monthly compounding**.
    - `etaMonthsToTarget(startValueEur, monthlyContributionEur, annualReturnPct, targetEur)`
      → integer months (or `null` if unreachable within a 600-month cap).
  - `modules/markten/index.ts` (or `modules/finance`) extended with
    `fetchQuotes(symbols): Promise<Record<symbol, {price, currency}>>` and
    `fetchFxToEur(currencies): Promise<Record<currency, number>>` using the
    same free keyless Yahoo endpoint (`EURUSD=X` etc.); **never throw**, degrade
    to empty on any failure (pattern of `fetchMarkten`).
  - Vitest covers every pure function incl. FX conversion, an empty/failed
    quote path, and DCA projection vs a hand-computed value. Gate green.
- **Files/areas:** `modules/finance/index.ts` (+ `finance.test.ts`),
  `modules/markten/index.ts`, `modules/shared/types.ts` (quote/FX shapes).
- **Locked decisions:** monthly compounding (annual→monthly rate = `(1+a)^(1/12)−1`).
  Contribution stream in the projection is a **constant** monthly € amount
  (the caller passes the current surplus/DCA figure). FX via Yahoo `EURUSD=X`
  (and per-currency `<CUR>EUR=X` as needed); if a rate is missing the holding
  is valued at 0 € and flagged, never guessed. Quotes/FX fetched **on page
  render** (server, `force-dynamic`) — no pipeline step, no price persistence.
- **Depends on:** Phase 1
- **Label:** auto-ok

### Phase 3 — Holdings & portfolio UI (the 3-line chart)
- **Goal:** manually manage holdings + buys and see the portfolio chart (cost
  basis / current value / compound projection) on `/financien`.
- **Acceptance criteria:**
  - Read query `getPortfolio(profileId)` in `app/lib/queries.ts` (holdings +
    buys + settings), returning a `PortfolioView`.
  - Write endpoints `app/api/holdings/route.ts` + `app/api/holding-buys/route.ts`
    (cookie-gated 401, `db().insert/upsert` with `profile_id`), following
    `app/api/feedback/route.ts`.
  - `app/financien/page.tsx` (copy `app/archive/page.tsx` guard shape,
    `force-dynamic`): server-fetches holdings+buys, live quotes+FX (Phase 2),
    renders the portfolio section.
  - `app/components/Financien*.tsx`: a holdings form (copy `CaptureFormulier.tsx`)
    + a **client SVG chart** with three series using `seriesPoints()` from
    `app/lib/stories.ts` (write the `<polyline>` renderer): cost-basis line,
    current-value marker/line, forward projection line; € axis via `geld.ts`;
    `financieel` amber (`#d97706`) + reserved interaction blue conventions.
  - Gate green (component compiles, pure feeds tested in Phase 2).
- **Files/areas:** `app/lib/queries.ts`, `app/api/holdings/route.ts`,
  `app/api/holding-buys/route.ts`, `app/financien/page.tsx`,
  `app/components/Financien*.tsx`, nav `<Link>` in `app/layout.tsx`.
- **Locked decisions:** the **current-value series is anchored at today**
  (a "today" point + the forward projection originating from it); the historical
  cost-basis line still spans first-buy→today. No historical market-value
  backfill in V1. Deleting/editing a holding/buy is in scope (simple edit form);
  crypto/overig allowed as `kind`. UI copy Dutch; new chart pattern gets a
  `docs/brandbook.md` recipe in this phase.
- **Depends on:** Phase 2
- **Label:** needs-siem *(live DB + live Yahoo + visual review)*

### Phase 4 — Income/expense report → monthly surplus (DCA driver)
- **Goal:** manual income + categorized expenses, a monthly report, and the
  surplus wired in as the projection's DCA contribution.
- **Acceptance criteria:**
  - `getCashflow(profileId)` in `app/lib/queries.ts` (incomes + expenses).
  - Write endpoints `app/api/income/route.ts` + `app/api/expenses/route.ts`
    (cookie-gated, per-profile insert).
  - Forms for income + expense (category, amount via `parseAmount`, date,
    recurring flag); a **monthly income-vs-expense report** section on
    `/financien` (per-month totals + surplus, recurring items projected forward).
  - The current month's **surplus becomes the projection's monthly
    contribution** on the Phase-3 chart (with a per-run override input).
  - Pure `monthlySurplus` + recurring-projection aggregation tested. Gate green.
- **Files/areas:** `app/lib/queries.ts`, `app/api/income/route.ts`,
  `app/api/expenses/route.ts`, `app/financien/page.tsx`,
  `app/components/Financien*.tsx`, `modules/finance/index.ts` (aggregation).
- **Locked decisions:** surplus = € income − € expenses for the month;
  **recurring** income/expenses auto-repeat forward for the projection;
  a fixed starter **expense category list** (Dutch: Wonen, Boodschappen,
  Vervoer, Abonnementen, Vrije tijd, Zorg, Overig) — free-text `label` on top.
  DCA contribution passed to `projectCompound` = the latest month's surplus,
  overridable in the UI (locked from the earlier round: "auto: income − expenses").
- **Depends on:** Phase 2 (math); parallelizable with Phase 3.
- **Label:** needs-siem

### Phase 5 — Goals: investment goal (ETA) + named savings goals
- **Goal:** set/track an investment goal (ETA from the projection) and multiple
  named savings goals with progress.
- **Acceptance criteria:**
  - `getGoals(profileId)` + write endpoint `app/api/goals/route.ts`
    (create/update/delete, cookie-gated).
  - Investment goal: target € (+ optional date); progress = live portfolio
    value / target; **ETA via `etaMonthsToTarget`** using current value +
    surplus DCA + expected return.
  - Savings goals: name + target € + `saved_eur` (manually updatable);
    progress bar; N goals supported.
  - A settings control for `expected_return_pct` (writes `finance_settings`).
  - Goal-progress + ETA pure helpers tested. Gate green.
- **Files/areas:** `app/lib/queries.ts`, `app/api/goals/route.ts`,
  `app/financien/page.tsx`, `app/components/Financien*.tsx`,
  `modules/finance/index.ts`.
- **Locked decisions:** exactly one **investment** goal (single target) + many
  **savings** goals; savings progress is manual `saved_eur` (no auto-linking to
  a bank in V1); ETA capped at 600 months → shown as "buiten bereik" when null.
- **Depends on:** Phases 3 + 4
- **Label:** needs-siem

### Phase 6 — Dashboard tiles + nav polish
- **Goal:** surface the headline finance numbers on the cover dashboard.
- **Acceptance criteria:**
  - Tiles on the cover (Atlas bento style, brandbook §5): **Netto waarde**
    (portfolio € + savings), **Deze maand over** (surplus), **Beleggingsdoel
    ETA**, **Rendement %** — each linking to `/financien`.
  - Reuses `getPortfolio`/`getCashflow`/`getGoals`; no new math.
  - Tiles use scheme tokens (no hardcoded palette); brandbook recipe added.
  - Gate green.
- **Files/areas:** cover dashboard component(s), `app/components/Financien*.tsx`,
  `docs/brandbook.md`.
- **Locked decisions:** four tiles as above; hidden gracefully when there's no
  finance data yet (empty-state, like `CijfersCard` gating).
- **Depends on:** Phases 3 + 4 + 5
- **Label:** needs-siem

## 5. Risks & rails

- **Yahoo endpoint fragility / rate limits:** it's an unofficial keyless
  endpoint. Rail: the fetchers **never throw**, degrade to empty (holding shown
  at cost basis / flagged "koers onbekend"), 6s timeout + concurrency cap like
  `fetchMarkten`. No hard dependency on a live price for the page to render.
- **FX correctness:** a wrong USD→EUR rate silently distorts everything. Rail:
  missing rate → value 0 € + visible flag, never a guessed rate; unit-tested
  conversion.
- **Financial-data privacy:** never leaves the profile cookie / service-role
  boundary; RLS enabled (no policies) so the anon key can't read it; never
  rendered in the shareable report or an Artifact.
- **Migration discipline:** one file `0019`, authored by the agent, **applied
  by Siem**; `modules/shared/types.ts` kept in sync.
- Standing rails (workflow.md): one issue = one branch = one session; gate
  green before every commit; €0.15 edition budget untouched (this feature makes
  **no AI calls** — Yahoo is a plain fetch, not `askAI`).

## 6. Decision log

- **2026-07-21 — PRD drafted with Siem.** Locked: (1) holdings entered
  **manually** (no CSV in this PRD — parked as a separate low-priority Linear
  task; no broker/bank linking — DEGIRO has no official API); (2) prices/FX from
  the **free keyless Yahoo** module, **multi-currency auto-converted to €**;
  (3) DCA contribution = **income − expenses monthly surplus** (overridable);
  (4) projection from a **user-set expected annual return** (default 7%,
  monthly compounding); (5) goals = **one investment goal (DCA-driven ETA) +
  many named savings goals + an income/expense report**; (6) surface =
  **dashboard tiles + a private `/financien` page** (cookie + RLS, single-user);
  (7) **no new dependency, no paid/keyed API, no AI calls**; (8) current-value
  chart series **anchored at today** for V1 (historical market-value line is a
  later enhancement).
- **2026-07-21 — Amendment (PRD #3 seam):** added
  `finance_settings.monthly_contribution_override` (nullable) to migration
  `0019` so the Settings Financiën tab (PRD #3) can override the auto
  surplus-driven DCA amount. The finance surfaces (holdings/goals/settings) are
  built as standalone components so PRD #3's tabbed settings mounts them without
  rework.
