# HANDOFF — MOR-15 settings tab shell, gate green, awaiting Siem's live review

> **Last updated:** 21 July 2026 (dispatched session) — on branch
> `MOR-15-settings-shell-2026-07-21`, PR #4 open against `main`

## Where we stand

This branch builds **MOR-15 (Settings P1 — tabbed settings shell)**, Phase 1
of `docs/prd/settings-tabs.md`. It branches off `main` at the point Wave 1
(Finance + Research foundations, see below) had just landed. Gate is green;
the PR is open; **not merged** — this is a `needs-siem` issue, Siem live-reviews
the restructured page before `/merge`.

## What this session did

Restructured `/instellingen` into a three-tab client shell, per the locked
decisions in the PRD (stay on `/instellingen`, no new route; tab order Account
· Financiën · Pipeline-rapport):

- **`app/components/InstellingenTabs.tsx`** (new) — the tab shell itself.
  Client component, tab state in `useState`, WAI-ARIA "tabs" pattern (pill
  `role="tablist"`, roving `tabIndex`, Left/Right/Home/End move focus and
  activate). Panels are handed in as `ReactNode` props from the
  server-rendered page — the shell owns no data fetching.
- **`app/components/InstellingenAccountTab.tsx`** (new) — wraps the
  pre-existing `/instellingen` content (onderwerp toevoegen / `CaptureFormulier`,
  interesses / `VoorkeurenKiezer` — **unchanged**, bronnen list, developer
  panel / `DevPaneel`) unmodified, just relocated out of `page.tsx` into this
  component so it mounts as the Account tab's content.
- **`app/components/InstellingenLeegState.tsx`** (new) — shared "komt
  binnenkort" placeholder card, used by the Financiën and Pipeline-rapport
  tabs. Names the phase that fills each tab in (MOR-17, MOR-16) — an
  intentional not-built-yet state, not a missing-data stub.
- **`app/instellingen/page.tsx`** (restructured) — still the async server
  component fetching `sources`/`voorkeuren` (unchanged queries), now renders
  `InstellingenTabs` with the three panels wired in.
- **`docs/brandbook.md` §5.1** (new) — "Settings tab shell" recipe: the pill
  tablist/tab-button styling and the empty-state card, so later tab-content
  phases (MOR-16/17/18) follow the pattern instead of re-improvising.
- Colors are scheme tokens only (`var(--accent)`, `var(--paper)`, `var(--line)`,
  `var(--muted)`, `var(--ink)`, `var(--faint)`) — no hardcoded palette in the
  new components. UI copy is Dutch.

**Commits:** `8f9b14e` (tab shell + Account/empty-state components + page
restructure), `d05b1a9` (brandbook §5.1).

**Gate:** green — `npm run lint && npx tsc --noEmit && npm test && npm run
build` (394 tests passed, build clean, 17 test files).

## What's open / next

1. **Siem — live-review this PR before merge.** Open
   `http://localhost:3000/instellingen` (worktree's dev server, or after
   `/merge`): confirm the three tabs switch correctly, keyboard nav (arrow
   keys / Home / End on the tablist) works, the Account tab's content and
   behavior are unchanged from before, Financiën/Pipeline-rapport show the
   "komt binnenkort" placeholder, and both light + dark schemes look right.
2. **After Siem's approval:** `/merge` MOR-15 → `main`. This unblocks:
   - **MOR-16** (Pipeline-rapport tab: today + 7/30-day trends, essentials
     metric set) — depends on Phase 1 only, can dispatch once this merges.
   - **MOR-17** (Financiën tab: mounts PRD #1 finance components) — depends
     on Phase 1 **and** the Finance surface phases (MOR-6/7/8/9, still
     Backlog).
   - **MOR-18** (Account tab: mounts PRD #2's `MijnOnderzoek`) — depends on
     Phase 1 **and** Research Tracking Phase 4 (`MijnOnderzoek` component,
     still Backlog).
3. Both integration tabs mount into `InstellingenTabs`'s existing `financien`/
   `pipeline` props with no shell change — per the PRD's "no shell change"
   locked decision, later sessions replace the `InstellingenLeegState` call
   with the real component, nothing else in this file changes.

## On main now (context this branch builds on — Wave 1, still current)

- **Finance foundation** (MOR-4 + MOR-5): `supabase/migrations/0019_finance.sql`
  (6 tables — holdings, holding_buys, incomes, expenses, finance_goals,
  finance_settings; **file only, Siem applies**); `app/lib/geld.ts` (€/%
  formatters); `modules/finance/index.ts` (costBasisSeries, quantityAsOf,
  portfolioValueEur, monthlySurplus, projectCompound, etaMonthsToTarget);
  `modules/markten` extended with keyless Yahoo `fetchQuotes`/`fetchFxToEur`.
- **Research foundation** (MOR-10 + MOR-11):
  `supabase/migrations/0020_user_research.sql` (**file only, Siem applies**);
  `modules/research/index.ts` extraction core (`buildExtractionPrompt`,
  `parseExtraction`, defensive scan-tier `extractResearch`).
- **Siem still needs to apply migrations `0019` + `0020`** to the live DB —
  needed before the Finance/Research `needs-siem` surface phases can be
  live-verified (unrelated to this branch, still open from Wave 1).

## Known issues / gotchas

- Freshly-created worktrees have no `node_modules` — this session ran
  `npm install` first (dispatched sessions should too).
- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Finance FX: per-buy `fx_to_eur` is caller-supplied (no historical-FX lookup);
  a non-EUR buy with no rate contributes 0 € (never guessed) — settled,
  reviewer-approved reading of the PRD.
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
