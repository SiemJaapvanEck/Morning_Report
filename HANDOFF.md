# HANDOFF — MOR-18 built on top of staging (MOR-9 + MOR-13), awaiting review

> **Last updated:** 23 July 2026 — dispatched local worktree session,
> `MOR-18-account-tab-research-mount-2026-07-23` (forked from `origin/staging`,
> which carries MOR-9 + MOR-13). PR #11 open against `staging`. Production
> (`main`) is unchanged.

## Where we stand

**MOR-18 — Settings P4: Account tab (mount research + preferences).** MOR-13
(the `MijnOnderzoek` component + research API) landed on `staging` earlier in
the day, unblocking this issue for the real mount (the 22 Jul cloud attempt
only had MOR-13's Linear spec to go on and built the empty-state fallback,
then lost its code to a 403 push failure).

This session:

- `InstellingenAccountTab.tsx` now renders `VoorkeurenKiezer` (unchanged)
  plus a new "Mijn onderzoek" section below the two-column preferences grid,
  mounting `MijnOnderzoek` (from MOR-13, unchanged) via a new optional
  `research?: ResearchNote[]` prop. When `research` is absent it falls back
  to `InstellingenLeegState` — the graceful-empty-state acceptance criterion,
  now dormant since the component is on `staging`, but still live code for
  any future caller that can't supply the data.
- `app/instellingen/page.tsx`: removed the temporary below-the-tabs
  `MijnOnderzoek` mount MOR-13 left there; `getResearch(profileId)`'s result
  is now passed straight into `InstellingenAccountTab` as the `research` prop.
- `MijnOnderzoek.tsx` itself: untouched, per the issue's locked decision
  ("no new logic beyond mounting").
- Gate green: lint clean, `tsc --noEmit` clean, 449/449 tests, build succeeded.
- Commit `1c10114`, pushed clean (no 403 — unlike the 22 Jul cloud session).
  PR #11 opened against `staging`. Linear issue → `in-review` label (team has
  no "In Review" status; `In Progress` is the closest workflow state and
  stays as the underlying status).

## Siem's queue

- Review PR #11 (`MOR-18: Settings P4 — Account tab`) — click through the
  Account tab on the `staging` preview: preferences unchanged, "Mijn
  onderzoek" now inside the tab (add a note, archive it, follow a
  storyline link).
- Once reviewed: orchestrator lands MOR-18 on `staging` per the standing
  merge policy; only Siem's explicit "approve" promotes `staging` → `main`.
- Carried from earlier landings: click through `docs/reviews/MOR-9.md` +
  `docs/reviews/MOR-13.md`; cloud GitHub write access (Contents: write)
  before any future overnight run (see `docs/ops/decisions-pending.md`) —
  this session's local push worked fine, so the gap is cloud-session-specific.
- Carried: cron-job.org tick fix · visual spot-checks of the six live
  features · non-EUR FX live-review item.
- MOR-17 (Financiën tab) is the other Wave 2 issue, independent of this one.

## Known issues / gotchas

- Finance FX: non-EUR cost-basis conversion uses *today's* FX rate; a
  non-EUR buy without a rate contributes €0 (by design — flag, don't invent).
- `seedResearchThread` anchors on `entities[0]` — watch weak first entities.
- `modules/research` `CATEGORY_SLUGS` mirrors the seeded `categories` table.
- Fresh worktrees need `npm install`; `rm -rf .next` on phantom
  duplicate-identifier tsc errors.
- `.claude/ntfy-topic.txt` is gitignored on purpose (public repo).
- No component-level tests exist anywhere in `app/components/` (house style:
  only pure `modules/` functions get unit tests) — this change follows that
  convention, no new test file added for the mount itself.
