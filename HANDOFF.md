# HANDOFF — MOR-8/12/16 in production; overnight sprints scheduled

> **Last updated:** 22 July 2026 — orchestrator session (interactive, with
> Siem). Siem approved the review queue → promoted staging → main. Two
> overnight sprint waves scheduled as cloud sessions. Checkout is on `main`.

## Where we stand

**Production (`main` = `dbfe1bb`) now carries MOR-8 (finance goals + ETA),
MOR-12 (research seed & track), MOR-16 (pipeline-rapport tab)** — promoted
with the double gate (staging gate green, merged main gate green), Siem's
explicit approve on record. `staging` is fast-forwarded to the same commit.
Linear: MOR-8/12/16 → Done; feature branches + worktrees deleted (local and
origin). Review queue is empty — WIP limit clear.

**Overnight schedule (22→23 Jul), approved by Siem — four one-shot cloud
routines** (claude.ai/code/routines, model claude-sonnet-5, Linear connector
attached, fresh clone of `main`, prompt = `/work` on the issue + a mandatory
reviewer pass that posts its verdict on the issue):

- **Sprint 1:** MOR-13 (MijnOnderzoek component + API) 19:30 CEST ·
  MOR-9 (finance dashboard tiles) 19:45 CEST.
- **Sprint 2:** MOR-17 (Financiën settings tab) 00:30 CEST ·
  MOR-18 (Account tab; graceful empty state if MOR-13 isn't on main) 00:45.
- Withheld: MOR-14 (needs MOR-13 landed). `needs-siem` issues were
  dispatched unattended on Siem's explicit instruction — the needs-siem
  gate moves to his staging review, as per the merge policy.

**Pipeline status:** xAI billing FIXED by Siem (22 Jul) and verified — the
7-21 Jul backlog was parked (946 open steps across 105 stale editions →
`skipped`, reversible by setting them back to `pending`) and today's 3
editions ran end-to-end clean (0 failed steps, daily papers finalized), so
MOR-16's tab now has real rows. MOR-12 live proof: matching confirmed (the
S&P 500 research storyline caught 1 item); the "sinds jouw onderzoek"
framing fires the first day a research storyline wins a deep-dive slot
(thread updates are the budget-capped deep path — `state` still null, so
the first-update condition is intact on prod). The cron-job.org tick job
is still broken (~1×/day instead of every 2 min) — Siem knows, parked.

**ntfy phone cards work** — test card delivered to the topic in
`.claude/ntfy-topic.txt` (HTTP 200, 22 Jul).

## What's next (morning session, 23 Jul)

- `/status`: collect the four overnight PRs, check reviewer verdicts on the
  issues, land gate-green branches on `staging` (double gate), write
  `docs/reviews/<issue>.md` docs, status card to Siem. Then MOR-14 becomes
  dispatchable once MOR-13 lands.
- Siem's queue: staging review of tonight's wave; cron fix; backlog decision;
  visual spot-checks of the six shipped features on production.

## Known issues / gotchas

- **Finance FX (live-review item):** non-EUR cost-basis conversion uses
  *today's* FX rate; a non-EUR buy without a rate contributes €0.
- MOR-16's pipeline-report numbers have still never rendered against real
  rows (pipeline was down); check after the next real edition.
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
