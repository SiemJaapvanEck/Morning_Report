# HANDOFF — Agent-team enrollment committed; Wave 2 surfaces on main

> **Last updated:** 22 July 2026 — enrollment files committed + `staging`
> pushed to GitHub (local session, follow-up to the cloud enrollment run).
> On `main`.

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
`0020` are applied to the live DB. Wave 2 surfaces are landed: the
**finance UI (MOR-6 + MOR-7)** and the **settings tab shell (MOR-15)** are
merged — all reviewer-approved, all double-gate green. The review queue
(MOR-8, MOR-12, MOR-16) stands at 3 — one over the WIP limit; no new
feature starts until Siem clears one.

## On main now (this session)

- **Finance UI (MOR-6 + MOR-7):** `/financien` page — 3-line portfolio chart
  (cost basis / current value / compound projection), holdings + buys
  management (inline edit/delete), income/expense forms + monthly report with
  forward "verwacht" months; current-month surplus feeds the chart's DCA
  default (overridable). `getPortfolio`/`getCashflow` in `app/lib/queries.ts`;
  cookie-gated routes `app/api/{holdings,holding-buys,income,expenses}`; pure
  math in `modules/finance` + `app/lib/financien.ts` (unit-tested). Brandbook §6.
- **Settings shell (MOR-15):** `/instellingen` is now a three-tab client shell
  (Account · Financiën · Pipeline-rapport). `VoorkeurenKiezer` + existing prefs
  relocated unchanged into the Account tab; Financiën + Pipeline-rapport are
  "komt binnenkort" placeholders filled by later phases. WAI-ARIA tabs pattern,
  scheme tokens. Brandbook §5.1.

## What's open / next — Wave-2 remaining (all Backlog, `needs-siem`)

- **Finance:** MOR-8 (goals + ETA), MOR-9 (dashboard tiles).
- **Research:** MOR-12 (seed & track → thread), MOR-13 (MijnOnderzoek
  component), MOR-14 (surface in report).
- **Settings convergence** (mount into the shell's `financien`/`pipeline`
  panel props, no shell change): MOR-16 (pipeline-rapport tab, dep: MOR-15
  only — dispatchable now), MOR-17 (Financiën tab ← MOR-8), MOR-18 (Account
  tab ← MOR-13).

Merged-branch cleanup: worktrees/branches for MOR-6 and MOR-15 removed this
session; Wave-1 MOR-4/MOR-10 worktrees can still be pruned if present.

## Known issues / gotchas

- **Finance FX (live-review item):** for non-EUR holdings, historical
  cost-basis conversion defaults to *today's* live FX rate, not the buy-date
  rate. Surfaced honestly by the implementer; watch real non-EUR positions.
  Per-buy `fx_to_eur` is caller-supplied; a non-EUR buy with no rate
  contributes 0 € (never guessed) — a settled, reviewer-approved reading.
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
