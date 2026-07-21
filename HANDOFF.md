# HANDOFF — Wave 1 landing (Research merged; Finance next)

> **Last updated:** 21 July 2026 (interactive session with Siem) — on `main`

## Where we stand

Wave 1 of the three-initiative plan is landing. Both dispatched sessions built
their two auto-ok phases, both reviewer-approved, both gate-green.

- **Research foundation MERGED to main** (this commit): MOR-10 + MOR-11.
- **Finance foundation approved, merging next**: MOR-4 + MOR-5 (PR #3) — merges
  right after this, with a rebase over the shared files (types.ts/HANDOFF/TIMELINE).

## On main now (Research foundation)

- `supabase/migrations/0020_user_research.sql` (**file only — Siem applies**):
  `user_research` table, profile-scoped, `thread_id` the sole research↔thread
  link (no `threads` schema change), status enum nieuw/gevolgd/gearchiveerd, RLS
  no-policy.
- `modules/research/index.ts`: pure `buildExtractionPrompt`/`parseExtraction`
  (entity normalize+cap-8, category-slug validation) + defensive `extractResearch`
  (one `askAI` scan-tier call, never throws) + 14 tests. `UserResearch` +
  `ResearchExtraction` types.

## What's open / next

1. **Merge Finance MOR-4+MOR-5** (PR #3) — approved; rebase over Research on
   main, re-gate, land. Delivers migration `0019_finance.sql`, `app/lib/geld.ts`,
   `modules/finance` math, keyless Yahoo `fetchQuotes`/`fetchFxToEur`.
2. **Siem — apply migrations `0019` + `0020`** to the live DB (needed before the
   Wave-2 needs-siem surface phases go live).
3. **Wave 2 (needs-siem), still Backlog:** Finance MOR-6…MOR-9, Research
   MOR-12…MOR-14, Settings MOR-15…MOR-18 (MOR-15 shell is ready/unblocked).
   Cross-issue blocks: MOR-17←MOR-8, MOR-18←MOR-13.

## Known issues / gotchas

- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration ever changes the catalog.
- Freshly-created worktrees have no `node_modules` — dispatched sessions run
  `npm install` first (both Wave-1 sessions did).
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
