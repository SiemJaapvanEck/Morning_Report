# HANDOFF — MOR-17 rebuilt, gate green, PR #12 open against staging

> **Last updated:** 23 July 2026 — dispatched (local worktree, Wave 2). This
> branch (`MOR-17-financien-settings-tab-2026-07-23`) is `staging`
> (`55b5d60`, MOR-9 + MOR-13 already landed there) plus MOR-17's Financiën
> tab. Neither `staging` nor `main` is touched by this session — the
> orchestrator lands PR #12 after review.

## Where we stand

**MOR-17 (Settings P3 — Financiën tab) rebuilt from a lost session.** A 22
Jul cloud session built this scope completely and its reviewer pass came
back APPROVE (2 non-blocking nits, 1 applied), but every GitHub write path
403'd and the commits died with the container — only the two Linear
comments (detailed build spec + reviewer verdict) survived. This session
rebuilt to that recorded end-state on a fresh branch forked from current
`staging`:

- `app/instellingen/page.tsx` fetches portfolio/cashflow/goals + live
  quotes/FX (same shape as `/financien`) and mounts a real Financiën tab
  instead of the MOR-15 placeholder.
- New `app/components/InstellingenFinancienTab.tsx`: headline stats (netto
  waarde, beleggingsdoel ETA) linking to `/financien`; a "snel bijwerken"
  quick-edit card (maandelijkse inleg override + verwacht rendement, one
  save to `/api/finance-settings`) — the only logic this tab owns; mounts
  `FinancienGoals` + `FinancienHoldingForm` **unchanged**.
- `app/api/finance-settings/route.ts` extended to a partial upsert: reads
  the existing row first, so a body with only one field never clobbers the
  other (both the `/financien` Goals section and this tab's quick-edit hit
  the same route).
- `docs/brandbook.md` §7bis "Financiën tab" recipe added.
- No migration — `monthly_contribution_override` already exists in
  migration `0019`.
- `etaLabel()` reused from `modules/finance` (landed via MOR-9, already on
  `staging`) — not re-extracted, honoring the lost session's reviewer nit.

**Gate green**: lint, tsc, 449 vitest tests, `next build`. 3 commits
(`3744661` API partial-upsert, `6a38c13` component + page wiring, `22e0d4b`
brandbook recipe), pushed clean (no 403 this time). PR #12 open, base
`staging`. Linear issue carries the `in-review` fallback label (the team has
no "In Review" status) and stays `In Progress` status-wise.

## Siem's queue

- Nothing yet — PR #12 needs a reviewer pass before the orchestrator lands
  it on `staging`. Once there, click-through review per the merge policy
  (only Siem's explicit "approve" promotes `staging` → `main`).
- MOR-18 (Account tab, real MijnOnderzoek mount) is the next Wave-2 item —
  independent of this branch, no dependency either way.

## Known issues / gotchas

- Finance FX: non-EUR cost-basis conversion uses *today's* FX rate; a
  non-EUR buy without a rate contributes €0 (by design — flag, don't invent).
- The Instellingen Financiën tab's headline "Netto waarde"/"ETA" figures are
  computed inline in `app/instellingen/page.tsx` from the same raw reads
  `/financien` uses (not via `getFinanceDashboardSnapshot()`, to avoid a
  second Yahoo/FX network round-trip for the same numbers) — same formulas,
  just not the same function call. Watch for drift if `summarizeFinanceDashboard()`'s
  net-worth formula ever changes without a matching update here.
- `seedResearchThread` anchors on `entities[0]` — watch weak first entities.
- `modules/research` `CATEGORY_SLUGS` mirrors the seeded `categories` table.
- Fresh worktrees need `npm install`; `rm -rf .next` on phantom
  duplicate-identifier tsc errors.
- `.claude/ntfy-topic.txt` is gitignored on purpose (public repo).
