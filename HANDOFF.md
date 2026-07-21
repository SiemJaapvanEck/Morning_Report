# HANDOFF — MOR-10 + MOR-11: Research Tracking foundation + extraction core

> **Last updated:** 21 July 2026 (dispatched session) — on
> `MOR-10-research-foundation-2026-07-21`

## Where we stand

This branch builds the first two phases of the Research Tracking PRD
(`docs/prd/research-tracking.md`): the data model (MOR-10) and the pure
extraction core (MOR-11). Both are `auto-ok` and gate-green on this branch.
Base was `origin/main` at dispatch time (workflow v2 + krant A2 + MOR-3 Tavily
citation UI).

## What this session did

**MOR-10 — Phase 1 (foundation):**
- `supabase/migrations/0020_user_research.sql` — new table `user_research`:
  profile-scoped (`profile_id → profiles(id) on delete cascade`), `title`,
  `body`, `entities text[]` (populated by MOR-11's extraction), `category_id →
  categories(id) on delete set null`, `thread_id → threads(id) on delete set
  null` (the **only** research↔thread link — no `threads` schema change, per
  the PRD's locked decision), `status` enum-by-check (`nieuw`/`gevolgd`/
  `gearchiveerd`), RLS-enable-no-policy (same pattern as `0003_rls.sql` /
  `0008_threads.sql`). **File only — not applied.** Siem applies `0020`
  alongside `0019_finance.sql` (MOR-4, other worktree).
- `UserResearch` interface added to `modules/shared/types.ts`.

**MOR-11 — Phase 2 (extraction core, pure):**
- `modules/research/index.ts`:
  - `buildExtractionPrompt(title, body)` — pure, Dutch prompt asking for
    strict JSON (`entities`, `topicLabel`, `categorySlug`).
  - `parseExtraction(raw)` — pure, defensive parser: strips a ```json fence,
    tolerates malformed/non-object JSON, normalizes+dedupes entities via
    `normalizeEntity` from `modules/threads`, caps at `MAX_ENTITIES` (8),
    validates `categorySlug` against a static `CATEGORY_SLUGS` list mirroring
    the seeded `categories` table (tech/wereld/financieel/games/wetenschap/
    frontier/lokaal/goed-nieuws) — unknown/missing → `null`.
  - `extractResearch(title, body)` — one `askAI` call, `scan` tier,
    `editionId: null` (runs on submit, outside the daily pipeline/budget),
    never throws — any failure degrades to `emptyExtraction()`, the same
    defensive contract as `modules/tavily`'s `searchTavily`.
  - `ResearchExtraction` interface added to `modules/shared/types.ts`.
- `modules/research/research.test.ts` — 14 new vitest cases: well-formed
  parse, markdown-fence stripping, empty/blank input, unparsable JSON,
  non-object JSON, entity dedupe+cap (via the alias map — Trump/Donald
  Trump/trump administration → one `trump` entry), non-string entity
  filtering, missing/wrong-typed `topicLabel`, missing/unknown `categorySlug`,
  and every known category slug accepted.

## Gate

Green on both commits: `npm run lint && npx tsc --noEmit && npm test && npm
run build`. Test suite: 338 → 352 (14 new). `npm install` was needed first —
this worktree had no `node_modules`.

## Commits on this branch

- `7d2eb2e` — MOR-10: user_research schema + types
- `614c9ed` — MOR-11: research extraction core + tests

## What's open / next

- **Not started (per instruction, stop here):** MOR-12 (seed & track: research
  → followed thread, `needs-siem` — live askAI + DB writes + a pipeline run),
  MOR-13 (`MijnOnderzoek` component + API), MOR-14 (surface research
  storylines in report/archive).
- **Siem to apply:** `supabase/migrations/0020_user_research.sql` (live DB —
  not run by this session, per the migration-file-only rule).
- PR opened referencing both MOR-10 and MOR-11; both issues moved to
  in-review. On reviewer approval + Siem's go → `/merge` this branch.

## Known issues / gotchas

- No deviations from the PRD's locked decisions. `CATEGORY_SLUGS` in
  `modules/research/index.ts` is a **static** mirror of the seeded
  `categories` table (kept pure/DB-free by design) — if the category catalog
  ever changes via a new migration, update that list alongside it.
- This worktree needed a fresh `npm install` (no `node_modules` present at
  session start) — unsurprising for a freshly created worktree, noting it in
  case other dispatched sessions hit the same on first run.
