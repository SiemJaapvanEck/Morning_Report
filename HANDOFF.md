# HANDOFF — staging carries MOR-9 + MOR-13 (rebuilt), awaiting Siem's review

> **Last updated:** 23 July 2026 — orchestrator landing on `staging`. This
> branch = `main` (`373b90a`) + MOR-9 + MOR-13, both reviewer-approved and
> double-gated. Production (`main`) is unchanged.

## Where we stand

**Overnight recovery.** All four 22→23 Jul cloud sprint sessions
(MOR-13/9/17/18) built their scope gate-green but hit a hard 403 on every
GitHub write path — commits died with the containers. Their Linear comments
survived as detailed build specs. Wave 1 (MOR-13 + MOR-9) was rebuilt
locally on 23 Jul, reviewed (both APPROVE), and landed here:

- **MOR-9 — Finance dashboard tiles + nav polish** (merge `69e8d10`, PR #9):
  four cover tiles (Netto waarde / Deze maand over / Beleggingsdoel ETA /
  Rendement %) linking to `/financien`; snapshot fetched only for today's
  edition (historical dates render no tiles); shared `etaLabel`/
  `rendementPct` + pure tested `summarizeFinanceDashboard()` in
  `modules/finance`. Review doc: `docs/reviews/MOR-9.md`.
- **MOR-13 — MijnOnderzoek component + API** (PR #10): GET/DELETE/PATCH on
  `app/api/research/route.ts` (cookie-gated, archive = soft delete scoped by
  `profile_id`), `getResearch()` in `app/lib/queries.ts`, self-contained
  `MijnOnderzoek.tsx` temporarily mounted below the tabs on `/instellingen`
  (real Account-tab mount is MOR-18). Review doc: `docs/reviews/MOR-13.md`.

**Wave 2 (MOR-17 Financiën tab · MOR-18 Account tab)** dispatches after this
landing — MOR-18 mounts the real MijnOnderzoek component now that MOR-13 is
on staging. MOR-14 is also unblocked.

## Siem's queue

- Click through `docs/reviews/MOR-9.md` + `docs/reviews/MOR-13.md` on the
  staging preview; explicit "approve" promotes staging → main.
- Cloud GitHub write access (Contents: write) before any future overnight
  run — see `docs/ops/decisions-pending.md`.
- Carried: cron-job.org tick fix · visual spot-checks of the six live
  features · non-EUR FX live-review item.

## Known issues / gotchas

- Finance FX: non-EUR cost-basis conversion uses *today's* FX rate; a
  non-EUR buy without a rate contributes €0 (by design — flag, don't invent).
- `seedResearchThread` anchors on `entities[0]` — watch weak first entities.
- `modules/research` `CATEGORY_SLUGS` mirrors the seeded `categories` table.
- Fresh worktrees need `npm install`; `rm -rf .next` on phantom
  duplicate-identifier tsc errors.
- `.claude/ntfy-topic.txt` is gitignored on purpose (public repo).
