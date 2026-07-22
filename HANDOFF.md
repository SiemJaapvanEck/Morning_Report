# HANDOFF — review queue landed on staging: MOR-8 + MOR-12 + MOR-16

> **Last updated:** 22 July 2026 — orchestrator session (interactive, with
> Siem). Landed all three review-queue branches onto `staging`, wrote the
> review docs. Checkout is on `staging`.

## Where we stand

**`staging` now carries the whole review queue**, per the new merge policy:

- **MOR-8 — finance goals + ETA** (`/financien`): investment-goal card with
  progress + `etaMonthsToTarget` ETA, savings-goal rows, expected-return
  control writing `finance_settings`. New `getGoals` + `app/api/goals` +
  `app/api/finance-settings` (cookie-gated). Brandbook §6 recipe.
- **MOR-12 — research seed & track**: `createResearch`/`seedResearchThread`
  in `modules/research` (reuses `modules/threads`' `insertThread`, no
  parallel matcher), POST `app/api/research`, `researchOriginFraming` in
  generate ("sinds jouw onderzoek" on a research thread's first update),
  `generateStep` hook via `isResearchOriginThread`. No UI yet (MOR-13).
- **MOR-16 — pipeline-rapport tab** (`/instellingen`): pure
  `modules/pipeline-report` aggregators + `getPipelineReport` query +
  server-rendered `InstellingenPipelineTab` (stat tiles, category bars,
  step durations, 7/30-edition sparklines). Brandbook §7; old §7-9 → §8-10.

Each branch landed with the double gate (source CI green, merged staging
gate green — 430 tests after MOR-16). Merge commits `89b8c07` (MOR-8),
`7982f80` (MOR-12), `19db38f` (MOR-16). Review docs for Siem:
`docs/reviews/MOR-8.md` / `MOR-12.md` / `MOR-16.md`, staging preview:
https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app

`main` is untouched today beyond the agent-team enrollment commit
(`9f628c0`): Bet & Flow orchestrator, settings deny-list hardening,
`docs/ops/` memory files. **Promotion `staging` → `main` waits for Siem's
explicit "approve"** — no exceptions.

## What's open / next

- **Siem: review MOR-8 / MOR-12 / MOR-16** on the staging preview using the
  review docs. The queue is at 3 (one over the WIP limit of 2) — no new
  feature dispatches until at least one clears.
- After approval → promote staging → main; then MOR-9 (dashboard tiles,
  ← MOR-8), MOR-13 (MijnOnderzoek UI) and MOR-17 (Financiën tab ← MOR-8)
  become the natural next dispatches (see `docs/ops/bets.md`).
- MOR-12's live proof (real askAI + pipeline run + "sinds jouw onderzoek"
  framing in the paper) mostly arrives with tomorrow's edition or with
  MOR-13's UI.

## Known issues / gotchas

- **Finance FX (live-review item):** non-EUR cost-basis conversion uses
  *today's* FX rate, not the buy-date rate; a non-EUR buy without a rate
  contributes €0 (never guessed). Watch real non-EUR positions.
- MOR-16's numbers have never rendered against real
  `pipeline_steps`/`usage_log` rows — Siem sanity-checks against a real
  edition; retried steps contribute every attempt to their kind's average.
- `seedResearchThread` anchors on `entities[0]` with no umbrella preference —
  a weak first entity may under-match; by design, watch in review.
- `.claude/ntfy-topic.txt` is **gitignored on purpose** (public repo; the
  topic name is the channel's only access control) — local checkout only.
- `.claude/settings.local.json` carries an uncommitted local diff — kept out
  of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Fresh worktrees have no `node_modules` — dispatched sessions `npm install`
  first.
- Build-cache hygiene: a file-sync tool clones files with a `" 2"` suffix;
  `rm -rf .next` before a gate on phantom duplicate-identifier errors.
