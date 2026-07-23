# HANDOFF — overnight wave lost to push 403, rebuilt + landed on staging

> **Last updated:** 23 July 2026 — orchestrator session (interactive, with
> Siem). Checkout is on `main` (`373b90a` + this ops commit). `staging` =
> main + MOR-9/13/18/17, awaiting Siem's review.

## Where we stand

**The 22→23 Jul overnight cloud sprints all failed at the same wall:** every
session (MOR-13, MOR-9, MOR-17, MOR-18) built its scope gate-green, but the
cloud environment's GitHub credentials are read-only — hard 403 on `git push`
AND the GitHub MCP write path. No branches, no PRs; commits died with the
containers. The sessions left detailed build specs + (for MOR-9/17) reviewer
verdicts in their Linear comments.

**Recovery (23 Jul, this session):** on Siem's instruction ("put all of
yesterday on staging"), all four were rebuilt in local worktrees from those
specs, each with a fresh reviewer pass (4× APPROVE) and a double-gated
staging landing (449 tests green throughout):

- MOR-9 (PR #9, `69e8d10`) — finance cover tiles, today-only snapshot.
- MOR-13 (PR #10, `87dcab8`) — MijnOnderzoek component + research API.
- MOR-18 (PR #11, `4abcf53`) — Account tab mounts research + preferences
  (real mount — better than the cloud attempt's empty state).
- MOR-17 (PR #12, `8cecf49`) — Financiën tab; `page.tsx` conflict with
  MOR-18 resolved, combined result gated green.

`staging` head: `f70bc9b`. Review docs: `docs/reviews/MOR-{9,13,17,18}.md`.
Preview: https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app
All three `/instellingen` tabs are now real. Linear: all four commented,
`in-review` labels; statuses stay `In Progress` (no In Review state).

## Siem's queue

- **Staging click-through** of the four review docs (one session: `/` for
  MOR-9, `/instellingen` for the rest) → explicit "approve" promotes to
  production. 4 items is over the WIP limit of 2, per Siem's explicit
  instruction.
- **Cloud GitHub write access** (Contents: write on the repo's App
  installation) — no overnight schedule until a cloud test push succeeds.
  See `docs/ops/decisions-pending.md`.
- Carried: cron-job.org tick fix · visual spot-checks of the six 22-Jul
  features · non-EUR FX live-review item.

## What's next

- MOR-14 (research storylines in report/archive) is unblocked — last open
  issue of the current bets; dispatch after the review queue drains or on
  Siem's word.
- Next betting ideas: MOR-1, MOR-2, per-buy FX entry (see docs/ops/bets.md).

## Worktrees / branches (cleanup after promotion)

- `../Morning_Report-worktrees/{MOR-9,MOR-13,MOR-17,MOR-18,staging}` — remove
  via `git worktree remove` once staging is promoted; then delete the four
  feature branches (local + origin). PRs #9-#12 (base: #9/#10 `main` — close
  or retarget; #11/#12 `staging`) close on promotion.

## Known issues / gotchas

- Finance FX: non-EUR cost basis uses *today's* FX rate; a non-EUR buy
  without a rate contributes €0 (by design — flag, don't invent).
- `seedResearchThread` anchors on `entities[0]` — watch weak first entities.
- `modules/research` `CATEGORY_SLUGS` mirrors the seeded `categories` table.
- Fresh worktrees need `npm install`; `rm -rf .next` on phantom
  duplicate-identifier tsc errors.
- `.claude/ntfy-topic.txt` gitignored on purpose (public repo).
- `.claude/settings.local.json` carries an uncommitted local diff (per-
  contributor file, keep out of commits).
