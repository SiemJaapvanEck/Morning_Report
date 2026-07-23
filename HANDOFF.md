# HANDOFF — staging carries the full recovered overnight wave (MOR-9/13/17/18)

> **Last updated:** 23 July 2026 — orchestrator, final Wave 2 landing. This
> branch = `main` (`373b90a`) + MOR-9 + MOR-13 + MOR-18 + MOR-17, all four
> reviewer-approved and double-gated. Production (`main`) is unchanged.

## Where we stand

**Overnight recovery complete (code-side).** All four 22→23 Jul cloud sprint
sessions built gate-green but hit a hard 403 on every GitHub write path —
commits died with the containers; their Linear comments survived as build
specs. All four were rebuilt locally on 23 Jul, reviewed (four APPROVEs),
and landed on `staging` with the double gate:

- **MOR-9 — Finance dashboard tiles + nav polish** (PR #9, merge `69e8d10`):
  four cover tiles (Netto waarde / Deze maand over / Beleggingsdoel ETA /
  Rendement %); snapshot only on today's edition; shared `etaLabel`/
  `rendementPct` + pure `summarizeFinanceDashboard()` in `modules/finance`.
- **MOR-13 — MijnOnderzoek component + research API** (PR #10, merge
  `87dcab8`): GET/DELETE/PATCH cookie-gated, archive = soft delete scoped by
  `profile_id`, `getResearch()` query, self-contained `MijnOnderzoek.tsx`.
- **MOR-18 — Account tab** (PR #11, merge `4abcf53`): MijnOnderzoek moved
  into the Account tab (mounted unchanged, `research` prop, LeegState
  fallback); MOR-13's temporary below-tabs mount removed.
- **MOR-17 — Financiën tab** (PR #12, merged last): real tab replaces the
  MOR-15 placeholder — headline stats + quick-edit card (`monthly_
  contribution_override` + `expected_return_pct`, partial-upsert on
  `/api/finance-settings` so `/financien`'s save keeps working), unchanged
  `FinancienGoals`/`FinancienHoldingForm` mounts, brandbook §7bis.
  Landing conflict in `app/instellingen/page.tsx` (MOR-18 × MOR-17) resolved:
  Account keeps the research prop, Financiën gets the real tab, the unused
  `InstellingenLeegState`/`MijnOnderzoek` page-level imports dropped.

Review docs for Siem: `docs/reviews/MOR-{9,13,17,18}.md` · preview:
https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app

**All three tabs on `/instellingen` are now real** (Account · Financiën ·
Pipeline-rapport) — the Settings convergence bet is fully built.

## Siem's queue

- Click through the four review docs on the staging preview (one session
  covers it: `/` for MOR-9, `/instellingen` for the rest). Explicit
  "approve" promotes staging → main. Note: 4 items exceeds the WIP limit of
  2 — per Siem's explicit "put everything from yesterday on staging".
- Cloud GitHub write access (Contents: write) before any future overnight
  run — see `docs/ops/decisions-pending.md`. Local pushes work fine.
- Carried: cron-job.org tick fix · visual spot-checks of the earlier six
  live features · non-EUR FX live-review item.

## What's next

- **MOR-14** (research storylines surfaced in report/archive) is unblocked —
  last open issue of the current bets. Dispatchable once the review queue
  drains (or on Siem's word).
- Backlog for next betting: MOR-1, MOR-2, per-buy FX entry.

## Known issues / gotchas

- Finance FX: non-EUR cost-basis conversion uses *today's* FX rate; a
  non-EUR buy without a rate contributes €0 (by design — flag, don't invent).
- `seedResearchThread` anchors on `entities[0]` — watch weak first entities.
- `modules/research` `CATEGORY_SLUGS` mirrors the seeded `categories` table.
- Fresh worktrees need `npm install`; `rm -rf .next` on phantom
  duplicate-identifier tsc errors.
- `.claude/ntfy-topic.txt` is gitignored on purpose (public repo).
- No component-level tests in `app/components/` (house style: only pure
  `modules/` functions get unit tests).
